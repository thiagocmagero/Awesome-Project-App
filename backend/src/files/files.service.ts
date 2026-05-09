import { Injectable, Logger } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import type { File as PrismaFile, FileScanStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { UsageService } from '../usage/usage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppException } from '../common/exceptions/app.exception';

import type { UploadFileDto } from './dto/upload-file.dto';
import type { RenameFileDto } from './dto/rename-file.dto';
import type {
  FileDownloadResponseDto,
  FileResponseDto,
} from './dto/file-response.dto';

/** Prefixo do bucket para uploads seguros (alvo do AWS GuardDuty Malware Protection). */
const SECURED_PREFIX = 'uploads/secured/';
/** Prefixo do bucket para uploads normais. */
const NORMAL_PREFIX = 'uploads/';
/** TTL default das presigned URLs de download (15 min). */
const DOWNLOAD_URL_TTL_SECONDS = 900;

interface ProjectContext {
  id: number;
  publicId: string;
  ownerId: number | null;
}

interface TaskContext {
  id: number;
  publicId: string;
}

interface UploadedFileBuffer {
  originalname: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly platformConfig: PlatformConfigService,
    private readonly usage: UsageService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  async list(
    projectPublicId: string,
    opts: { taskPublicId?: string; scope?: 'project' | 'all' },
  ): Promise<FileResponseDto[]> {
    const project = await this.resolveProject(projectPublicId);
    const where: Prisma.FileWhereInput = {
      projectId: project.id,
      status: 'ACTIVE',
    };
    if (opts.taskPublicId) {
      const task = await this.resolveTaskInProject(opts.taskPublicId, project.id);
      where.taskId = task.id;
    } else if (opts.scope === 'project') {
      where.taskId = null;
    }
    const records = await this.prisma.file.findMany({
      where,
      include: {
        uploadedBy: { select: { publicId: true, name: true } },
        task: { select: { publicId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toResponse(r));
  }

  async upload(
    projectPublicId: string,
    requestingUserId: number,
    file: UploadedFileBuffer,
    dto: UploadFileDto,
  ): Promise<FileResponseDto> {
    if (!file?.buffer || file.size === 0) {
      throw new AppException('FILE_MISSING', HttpStatus.BAD_REQUEST);
    }
    // Corrige misdecode Latin-1 → UTF-8 no nome do multipart (Multer/busboy
    // default). Acentos como `ç`, `õ`, `ª` viriam mangled (`Ã§`, `Ãµ`, `Âª`)
    // sem este passo. Ver `decodeMultipartFilename` abaixo.
    const originalName = this.decodeMultipartFilename(file.originalname);

    const project = await this.resolveProject(projectPublicId);

    // 1. Tamanho contra cap absoluto da plataforma. (Plan limit `max_upload_size_mb`
    //    é validado no controller via @CheckPlanLimit antes de chegar aqui.)
    const platformMaxBytes = await this.platformConfig.getMaxUploadBytes();
    if (file.size > platformMaxBytes) {
      throw new AppException('FILE_TOO_LARGE_PLATFORM', HttpStatus.PAYLOAD_TOO_LARGE, {
        max_mb: Math.floor(platformMaxBytes / 1024 / 1024),
        size_mb: Math.ceil(file.size / 1024 / 1024),
      });
    }

    // 2. file-type magic bytes + MIME allowlist + extension allowlist
    const detected = await this.detectAndValidateMime(file.buffer, originalName);

    // 3. Resolve task se fornecida
    const task = dto.taskPublicId
      ? await this.resolveTaskInProject(dto.taskPublicId, project.id)
      : null;

    // 4. Owner-resolved feature flag — `upload_secured` do plano do dono do projecto.
    //    Sem owner (deveria ser raro — Project.ownerId = SetNull em delete do user)
    //    ⇒ trata como inactivo (path normal).
    const isSecured = project.ownerId
      ? await this.featureFlags.isEnabledForUser(project.ownerId, 'upload_secured')
      : false;

    // 5. Build bucket key — UUID v4 aleatório, sem informação que indique propriedade.
    const bucketKey = this.buildBucketKey({
      isSecured,
      projectPublicId: project.publicId,
      taskPublicId: task?.publicId ?? null,
      ext: detected.ext,
    });

    // 6. S3 first, DB second. Em falha de DB temos um orphan no bucket (key UUID,
    //    sem colisão), mas o ficheiro não aparece na app — admin pode limpar.
    await this.storage.putPrivateObject(bucketKey, file.buffer, detected.mime);

    let created: PrismaFile;
    try {
      created = await this.prisma.file.create({
        data: {
          bucketKey,
          isSecuredPath: isSecured,
          originalName: originalName.slice(0, 255),
          mimeType: detected.mime,
          sizeBytes: file.size,
          projectId: project.id,
          taskId: task?.id ?? null,
          uploadedById: requestingUserId,
          scanStatus: isSecured ? 'PENDING' : null,
        },
      });
    } catch (err) {
      // Cleanup do bucket object — DB falhou, não há registo apontando ao key.
      await this.storage.deletePrivateObject(bucketKey).catch(() => {});
      throw err;
    }

    // 7. Usage tracking — sempre no plano do dono do projecto.
    if (project.ownerId) {
      await this.usage.increment(project.ownerId, 'max_uploads_count');
      const sizeMb = Math.max(1, Math.ceil(file.size / 1024 / 1024));
      await this.usage.incrementBy(project.ownerId, 'max_storage_mb', sizeMb);
    }

    return this.refreshAndMap(created.id);
  }

  async replace(
    projectPublicId: string,
    fileId: string,
    file: UploadedFileBuffer,
  ): Promise<FileResponseDto> {
    if (!file?.buffer || file.size === 0) {
      throw new AppException('FILE_MISSING', HttpStatus.BAD_REQUEST);
    }
    // Idêntico ao upload — corrige Multer Latin-1 default antes de tudo.
    const originalName = this.decodeMultipartFilename(file.originalname);

    const project = await this.resolveProject(projectPublicId);
    const existing = await this.findActiveFileInProject(fileId, project.id);

    const platformMaxBytes = await this.platformConfig.getMaxUploadBytes();
    if (file.size > platformMaxBytes) {
      throw new AppException('FILE_TOO_LARGE_PLATFORM', HttpStatus.PAYLOAD_TOO_LARGE, {
        max_mb: Math.floor(platformMaxBytes / 1024 / 1024),
        size_mb: Math.ceil(file.size / 1024 / 1024),
      });
    }

    const detected = await this.detectAndValidateMime(file.buffer, originalName);

    // O path mantém-se com base no `isSecuredPath` actual — não migra mesmo
    // que a flag `upload_secured` do owner tenha mudado. Spec: ficheiros
    // antigos seguem regra do momento do upload original. Replace conta como
    // mesmo registo.
    const newKey = this.buildBucketKeyLike(existing, detected.ext);
    const oldKey = existing.bucketKey;
    const sizeDelta = file.size - existing.sizeBytes;

    await this.storage.putPrivateObject(newKey, file.buffer, detected.mime);

    let updated: PrismaFile;
    try {
      updated = await this.prisma.file.update({
        where: { id: existing.id },
        data: {
          bucketKey: newKey,
          mimeType: detected.mime,
          sizeBytes: file.size,
          originalName: originalName.slice(0, 255),
          // Reset scan apenas em path secured — o conteúdo é novo.
          scanStatus: existing.isSecuredPath ? 'PENDING' : null,
        },
      });
    } catch (err) {
      await this.storage.deletePrivateObject(newKey).catch(() => {});
      throw err;
    }

    // Cleanup do key antigo — best-effort (não invalida o replace).
    this.storage.deletePrivateObject(oldKey).catch((e) => {
      this.logger.warn(`Failed to delete old key ${oldKey}: ${e?.message ?? e}`);
    });

    if (project.ownerId && sizeDelta !== 0) {
      const deltaMb = Math.ceil(Math.abs(sizeDelta) / 1024 / 1024);
      await this.usage.adjustBy(
        project.ownerId,
        'max_storage_mb',
        sizeDelta > 0 ? deltaMb : -deltaMb,
      );
    }

    return this.refreshAndMap(updated.id);
  }

  async getDownloadUrl(
    projectPublicId: string,
    fileId: string,
  ): Promise<FileDownloadResponseDto> {
    const project = await this.resolveProject(projectPublicId);
    const file = await this.findActiveFileInProject(fileId, project.id);

    if (file.scanStatus === 'INFECTED') {
      throw new AppException('FILE_INFECTED_BLOCKED', HttpStatus.FORBIDDEN);
    }

    // Passa `originalName` ao storage — ele injecta `ResponseContentDisposition`
    // no presigned com `filename*=UTF-8''...` para que o browser descarregue
    // com o nome humano em vez do UUID hash do bucketKey.
    const url = await this.storage.getSignedDownloadUrl(
      file.bucketKey,
      DOWNLOAD_URL_TTL_SECONDS,
      file.originalName,
    );
    const expiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString();
    return { url, expiresAt };
  }

  async rename(
    projectPublicId: string,
    fileId: string,
    dto: RenameFileDto,
  ): Promise<FileResponseDto> {
    const trimmed = dto.originalName.trim();
    if (!trimmed) {
      throw new AppException('FILE_NAME_EMPTY', HttpStatus.BAD_REQUEST);
    }
    const project = await this.resolveProject(projectPublicId);
    const file = await this.findActiveFileInProject(fileId, project.id);

    const updated = await this.prisma.file.update({
      where: { id: file.id },
      data: { originalName: trimmed.slice(0, 255) },
    });
    return this.refreshAndMap(updated.id);
  }

  async remove(projectPublicId: string, fileId: string): Promise<{ deleted: string }> {
    const project = await this.resolveProject(projectPublicId);
    const file = await this.findActiveFileInProject(fileId, project.id);

    // Soft delete em DB; apaga bytes do bucket em best-effort.
    await this.prisma.file.update({
      where: { id: file.id },
      data: { status: 'INACTIVE' },
    });
    this.storage.deletePrivateObject(file.bucketKey).catch((e) => {
      this.logger.warn(
        `Failed to delete bucket object ${file.bucketKey} after soft-delete: ${e?.message ?? e}`,
      );
    });

    if (project.ownerId) {
      await this.usage.decrement(project.ownerId, 'max_uploads_count');
      const sizeMb = Math.max(1, Math.ceil(file.sizeBytes / 1024 / 1024));
      await this.usage.decrementBy(project.ownerId, 'max_storage_mb', sizeMb);
    }

    return { deleted: file.publicId };
  }

  /**
   * Recebe veredicto do GuardDuty (chamado pelo webhook controller após
   * verificação SNS). `bucketKey` identifica o ficheiro de forma única.
   * Idempotente — múltiplos events para o mesmo key são seguros.
   */
  async recordScanResult(
    bucketKey: string,
    verdict: 'CLEAN' | 'INFECTED',
  ): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { bucketKey } });
    if (!file) {
      // Event chegou depois de soft-delete + bucket cleanup. Sem-op.
      this.logger.log(`Scan result for unknown bucketKey=${bucketKey} — ignored.`);
      return;
    }
    // Já decidido — não re-escrever (evita "PENDING" sobrepôr CLEAN/INFECTED).
    if (file.scanStatus === verdict) return;

    if (verdict === 'INFECTED') {
      // Apaga bytes do bucket; preserva DB record para audit.
      await this.storage.deletePrivateObject(bucketKey).catch((e) => {
        this.logger.warn(
          `INFECTED but delete bucket object ${bucketKey} failed: ${e?.message ?? e}`,
        );
      });
      await this.prisma.file.update({
        where: { id: file.id },
        data: { scanStatus: 'INFECTED' as FileScanStatus },
      });
      if (file.uploadedById) {
        this.notifications
          .createFileInfectedNotification(file.uploadedById, {
            filePublicId: file.publicId,
            originalName: file.originalName,
          })
          .catch(() => {});
      }
      return;
    }

    await this.prisma.file.update({
      where: { id: file.id },
      data: { scanStatus: 'CLEAN' as FileScanStatus },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Multer (via busboy) descodifica o `filename` do multipart como Latin-1
   * por defeito. Os browsers enviam UTF-8 — então um nome como
   * `Aplicações.docx` chega-nos como `AplicaÃ§Ãµes.docx`. Solução: reinterpretar
   * a string como bytes Latin-1 e decode UTF-8.
   *
   * Heurística para evitar corrupção quando o nome JÁ está bem decodificado:
   * tenta o round-trip com `TextDecoder fatal=true` — se os bytes resultantes
   * não formam UTF-8 válido, o nome original já estava certo (provavelmente
   * ASCII puro ou um cliente raro que envia UTF-8 directo). Mantemos como está.
   *
   * Edge cases:
   * - ASCII puro (`report.pdf`): bytes idênticos, UTF-8 válido → identidade ✓
   * - UTF-8 mal-decodificado (`Ã§` para `ç`): bytes `0xC3 0xA7` → `ç` ✓
   * - UTF-8 já correcto (`ç`): byte 0xE7 sozinho → UTF-8 inválido → mantém `ç` ✓
   * - Latin-1 genuíno (`café` em latin-1, byte 0xE9 isolado): inválido em
   *   UTF-8 → mantém. Browsers modernos não enviam Latin-1 puro, é teórico.
   */
  private decodeMultipartFilename(name: string): string {
    if (!name) return name;
    // Skip se for ASCII puro — não há nada para corrigir.
    if (/^[\u0000-\u007f]*$/.test(name)) return name;
    try {
      const buf = Buffer.from(name, 'latin1');
      return new TextDecoder('utf-8', { fatal: true }).decode(buf);
    } catch {
      // Bytes não formam UTF-8 válido — nome já estava correctamente
      // decodificado, devolver original.
      return name;
    }
  }

  private async resolveProject(publicId: string): Promise<ProjectContext> {
    const project = await this.prisma.project.findUnique({
      where: { publicId },
      select: { id: true, publicId: true, ownerId: true, status: true },
    });
    if (!project || project.status !== 'ACTIVE') {
      throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return { id: project.id, publicId: project.publicId, ownerId: project.ownerId };
  }

  private async resolveTaskInProject(
    publicId: string,
    projectId: number,
  ): Promise<TaskContext> {
    const task = await this.prisma.task.findUnique({
      where: { publicId },
      select: { id: true, publicId: true, projectId: true },
    });
    if (!task || task.projectId !== projectId) {
      throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return { id: task.id, publicId: task.publicId };
  }

  private async findActiveFileInProject(
    publicId: string,
    projectId: number,
  ): Promise<PrismaFile> {
    const file = await this.prisma.file.findUnique({ where: { publicId } });
    if (!file || file.projectId !== projectId || file.status !== 'ACTIVE') {
      throw new AppException('FILE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return file;
  }

  private async detectAndValidateMime(
    buffer: Buffer,
    originalName: string,
  ): Promise<{ mime: string; ext: string }> {
    const detected = await fileTypeFromBuffer(buffer);
    // Extensão "humana" (a que o user vê no nome) — usada apenas em mensagens
    // de erro quando o magic-bytes detect falha. A validação canónica é
    // sempre `detected.ext`.
    const filenameExt = (originalName.split('.').pop() ?? '').toLowerCase();

    if (!detected) {
      throw new AppException('UNRECOGNIZED_FILE_TYPE', HttpStatus.BAD_REQUEST, {
        extension: filenameExt || null,
      });
    }

    const [allowedMimes, allowedExts] = await Promise.all([
      this.platformConfig.getAllowedMimeTypes(),
      this.platformConfig.getAllowedFileExtensions(),
    ]);

    if (allowedMimes.length === 0 || !allowedMimes.includes(detected.mime)) {
      throw new AppException('MIME_NOT_ALLOWED', HttpStatus.UNSUPPORTED_MEDIA_TYPE, {
        mime: detected.mime,
        allowed_mimes: allowedMimes,
      });
    }

    if (allowedExts.length === 0 || !allowedExts.includes(detected.ext)) {
      throw new AppException('EXTENSION_NOT_ALLOWED', HttpStatus.UNSUPPORTED_MEDIA_TYPE, {
        extension: detected.ext,
        allowed_extensions: allowedExts,
      });
    }

    return { mime: detected.mime, ext: detected.ext };
  }

  private buildBucketKey(args: {
    isSecured: boolean;
    projectPublicId: string;
    taskPublicId: string | null;
    ext: string;
  }): string {
    const segments: string[] = [];
    segments.push(args.isSecured ? `${SECURED_PREFIX}projects` : `${NORMAL_PREFIX}projects`);
    // Acima já começou com "uploads/" — strip the trailing slash via raw concat.
    // Reconstruímos de forma limpa abaixo:
    return [
      args.isSecured ? 'uploads/secured/projects' : 'uploads/projects',
      args.projectPublicId,
      ...(args.taskPublicId ? ['tasks', args.taskPublicId] : ['_root']),
      `${randomUUID()}.${args.ext}`,
    ].join('/');
  }

  /**
   * Replica a estrutura do `bucketKey` existente (mesmo prefix secured/normal,
   * mesmo project, mesmo `_root`/`tasks/{taskPublicId}`), mas com novo UUID
   * e possivelmente nova extensão.
   *
   * Importante: parsing do path antigo em vez de inferir do `taskId`/projectId
   * actuais — uma task que mudou de projecto-para-projecto teria deixado o
   * path antigo desalinhado, mas não suportamos esse caso. O ficheiro é
   * imutável quanto a project/task; só `bucketKey` muda.
   */
  private buildBucketKeyLike(file: PrismaFile, ext: string): string {
    // O path antigo é "uploads/[secured/]projects/{publicId}/(tasks/{publicId}|_root)/{uuid}.{ext}"
    // Reconstruir tudo até ao último segmento e substituir o leaf.
    const lastSlash = file.bucketKey.lastIndexOf('/');
    if (lastSlash === -1) {
      // Não devia acontecer — fallback defensivo: começa de novo no normal _root.
      return `uploads/projects/_unknown/_root/${randomUUID()}.${ext}`;
    }
    const prefix = file.bucketKey.slice(0, lastSlash);
    return `${prefix}/${randomUUID()}.${ext}`;
  }

  private async refreshAndMap(id: number): Promise<FileResponseDto> {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { publicId: true, name: true } },
        task: { select: { publicId: true } },
      },
    });
    if (!file) throw new AppException('FILE_NOT_FOUND', HttpStatus.NOT_FOUND);
    return this.toResponse(file);
  }

  private toResponse(
    file: PrismaFile & {
      uploadedBy: { publicId: string; name: string } | null;
      task: { publicId: string } | null;
    },
  ): FileResponseDto {
    return {
      publicId: file.publicId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      scanStatus: file.scanStatus,
      isSecured: file.isSecuredPath,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
      task: file.task,
    };
  }
}
