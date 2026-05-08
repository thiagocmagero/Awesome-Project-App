import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmailConfigDto } from './dto/update-email-config.dto';
import { UpdatePlatformLimitsDto } from './dto/update-platform-limits.dto';

/** Default singleton para PlatformLimits (id=1). */
const DEFAULT_MAX_TASK_BUSINESS_DAYS = 1300;
const DEFAULT_MAX_UPLOAD_SIZE_MB = 50;
/** Allowlist por defeito quando o singleton ainda não foi tocado pelo admin. */
const DEFAULT_ALLOWED_MIME_TYPES: ReadonlyArray<string> = [];
const DEFAULT_ALLOWED_FILE_EXTENSIONS: ReadonlyArray<string> = [];

@Injectable()
export class PlatformConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Email Config ────────────────────────────────────────────────────────────

  /** Retorna a configuração de email (registo singleton id=1).
   *  Nunca expõe a palavra-passe no GET — devolve boolean `hasPassword`. */
  async getEmailConfig() {
    const config = await this.prisma.emailConfig.findUnique({ where: { id: 1 } });
    if (!config) return this.defaultEmailConfig();

    const { password, ...safe } = config;
    return { ...safe, hasPassword: !!password };
  }

  /** Cria ou actualiza a configuração de email (upsert no id=1). */
  async upsertEmailConfig(dto: UpdateEmailConfigDto) {
    const data: Record<string, unknown> = {};

    if (dto.enabled   !== undefined) data.enabled   = dto.enabled;
    if (dto.host      !== undefined) data.host      = dto.host || null;
    if (dto.port      !== undefined) data.port      = dto.port;
    if (dto.secure    !== undefined) data.secure    = dto.secure;
    if (dto.username  !== undefined) data.username  = dto.username || null;
    if (dto.fromEmail !== undefined) data.fromEmail = dto.fromEmail || null;
    if (dto.fromName  !== undefined) data.fromName  = dto.fromName || null;

    // Só actualiza a password se for enviada (string não vazia)
    if (dto.password !== undefined) {
      data.password = dto.password.trim() || null;
    }

    const config = await this.prisma.emailConfig.upsert({
      where:  { id: 1 },
      create: { id: 1, enabled: false, port: 587, secure: false, ...data },
      update: data,
    });

    const { password, ...safe } = config;
    return { ...safe, hasPassword: !!password };
  }

  // ── Platform Limits ─────────────────────────────────────────────────────────

  /**
   * Lê os limites globais (singleton id=1). Acessível a qualquer user
   * autenticado — nenhum dado sensível, só caps de validação. O frontend
   * usa para mostrar mensagens de UX antes do submit (TaskModal).
   */
  async getLimits() {
    const config = await this.prisma.platformLimits.findUnique({ where: { id: 1 } });
    if (!config) {
      return {
        id: 1,
        maxTaskBusinessDays: DEFAULT_MAX_TASK_BUSINESS_DAYS,
        maxUploadSizeMb: DEFAULT_MAX_UPLOAD_SIZE_MB,
        allowedMimeTypes: [...DEFAULT_ALLOWED_MIME_TYPES],
        allowedFileExtensions: [...DEFAULT_ALLOWED_FILE_EXTENSIONS],
        updatedAt: new Date(),
      };
    }
    return {
      ...config,
      // Campos JSON em BD — normalizar para array de strings.
      allowedMimeTypes: this.coerceStringArray(config.allowedMimeTypes),
      allowedFileExtensions: this.coerceStringArray(config.allowedFileExtensions),
    };
  }

  /**
   * Devolve só `maxTaskBusinessDays` — usado pelos services internos (helper
   * `assertTaskDurationWithinLimit`) sem expor o resto do registo.
   */
  async getMaxTaskBusinessDays(): Promise<number> {
    const config = await this.prisma.platformLimits.findUnique({
      where: { id: 1 },
      select: { maxTaskBusinessDays: true },
    });
    return config?.maxTaskBusinessDays ?? DEFAULT_MAX_TASK_BUSINESS_DAYS;
  }

  /**
   * Tamanho máximo absoluto para um upload, em bytes. Lido pelo `FilesService`
   * antes de aceitar o multipart. O cap por plano (`max_upload_size_mb`)
   * pode ser mais restritivo, nunca mais permissivo.
   */
  async getMaxUploadBytes(): Promise<number> {
    const config = await this.prisma.platformLimits.findUnique({
      where: { id: 1 },
      select: { maxUploadSizeMb: true },
    });
    const mb = config?.maxUploadSizeMb ?? DEFAULT_MAX_UPLOAD_SIZE_MB;
    return mb * 1024 * 1024;
  }

  /**
   * Allowlist de MIME types aceites. `FilesService` valida o MIME real
   * detectado por magic bytes contra esta lista (Content-Type declarado pelo
   * cliente é ignorado). Lista vazia = todos os uploads bloqueados — admin
   * tem que configurar antes de habilitar a feature na app.
   */
  async getAllowedMimeTypes(): Promise<string[]> {
    const config = await this.prisma.platformLimits.findUnique({
      where: { id: 1 },
      select: { allowedMimeTypes: true },
    });
    return this.coerceStringArray(config?.allowedMimeTypes);
  }

  /**
   * Allowlist de extensões aceites (canónica, sem ponto, lowercase).
   * `FilesService` valida `detected.ext` (do file-type) contra esta lista.
   * Lista vazia = bloqueado. Defesa em camadas — extensão tem que estar OK
   * E o MIME tem que estar OK; ambas as listas são independentes.
   */
  async getAllowedFileExtensions(): Promise<string[]> {
    const config = await this.prisma.platformLimits.findUnique({
      where: { id: 1 },
      select: { allowedFileExtensions: true },
    });
    return this.coerceStringArray(config?.allowedFileExtensions);
  }

  /** Upsert id=1 — apenas PLATFORM_ADMIN (controller assert). */
  async upsertLimits(dto: UpdatePlatformLimitsDto) {
    const data: Record<string, unknown> = {};
    if (dto.maxTaskBusinessDays !== undefined) {
      data.maxTaskBusinessDays = dto.maxTaskBusinessDays;
    }
    if (dto.maxUploadSizeMb !== undefined) {
      data.maxUploadSizeMb = dto.maxUploadSizeMb;
    }
    if (dto.allowedMimeTypes !== undefined) {
      // Dedupe + lowercase + trim para normalizar input do admin.
      const normalized = Array.from(
        new Set(dto.allowedMimeTypes.map((m) => m.trim().toLowerCase()).filter(Boolean)),
      );
      data.allowedMimeTypes = normalized;
    }
    if (dto.allowedFileExtensions !== undefined) {
      // Strip dots, lowercase, trim, dedupe. Aceita "pdf", ".pdf", "PDF",
      // " pdf ", todos viram "pdf".
      const normalized = Array.from(
        new Set(
          dto.allowedFileExtensions
            .map((e) => e.trim().toLowerCase().replace(/^\.+/, ''))
            .filter(Boolean),
        ),
      );
      data.allowedFileExtensions = normalized;
    }
    const updated = await this.prisma.platformLimits.upsert({
      where:  { id: 1 },
      create: {
        id: 1,
        maxTaskBusinessDays: DEFAULT_MAX_TASK_BUSINESS_DAYS,
        maxUploadSizeMb: DEFAULT_MAX_UPLOAD_SIZE_MB,
        allowedMimeTypes: [...DEFAULT_ALLOWED_MIME_TYPES],
        allowedFileExtensions: [...DEFAULT_ALLOWED_FILE_EXTENSIONS],
        ...data,
      },
      update: data,
    });
    return {
      ...updated,
      allowedMimeTypes: this.coerceStringArray(updated.allowedMimeTypes),
      allowedFileExtensions: this.coerceStringArray(updated.allowedFileExtensions),
    };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private defaultEmailConfig() {
    return {
      id: 1,
      enabled: false,
      host: null,
      port: 587,
      secure: false,
      username: null,
      fromEmail: null,
      fromName: null,
      hasPassword: false,
      updatedAt: new Date(),
    };
  }

  /** Converte um campo JSON Prisma (`JsonValue`) em `string[]`, filtrando não-strings. */
  private coerceStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === 'string');
  }
}
