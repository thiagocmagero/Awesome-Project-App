import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppException } from '../common/exceptions/app.exception';
import { HttpStatus } from '@nestjs/common';
import { readS3Env, S3Env } from './storage.config';

/**
 * Wrapper sobre o AWS SDK para operações de storage. Único ponto da app que
 * sabe da existência dum cliente S3.
 *
 * Inicialização **lazy & defensiva** — se as env vars faltarem, o service
 * arranca em modo `disabled` e devolve `isReady() === false`. Endpoints que
 * dependem dele devolvem 503 `STORAGE_NOT_READY`. UI pode consultar
 * `GET /platform-config/storage/availability` para gating prévio.
 *
 * Buckets:
 * - **Público**: avatares (`avatars/{publicId}.webp`). URL directa, sem TTL.
 * - **Privado**: uploads project-scoped (`uploads/[secured/]projects/...`).
 *   Acesso só via presigned URL (`getSignedDownloadUrl`) — keys são opacos
 *   e nunca expostos pela API REST.
 *
 * Pipeline de validação MIME real + reprocessamento vive nos callers
 * (`UsersService.updateMyAvatar` para avatares, `FilesService.upload` para
 * ficheiros). Este service apenas put/delete/sign — não inspeciona payloads.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private client: S3Client | null = null;
  private env: S3Env | null = null;
  private readonly logger = new Logger(StorageService.name);

  /** MIME types reais (detectados via `file-type`) aceites para avatar. SVG bloqueado por XSS. */
  private static readonly ALLOWED_AVATAR_MIME = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  /** 5 MB — limite hard, alinhado com hint do template Zynix e Multer. */
  private static readonly MAX_AVATAR_BYTES = 5 * 1024 * 1024;

  onModuleInit() {
    const { env, missing } = readS3Env();
    if (!env) {
      this.logger.warn(
        `S3 disabled — env vars em falta: ${missing.join(', ')}`,
      );
      return;
    }
    this.env = env;
    this.client = new S3Client({
      region: env.region,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    });
    this.logger.log(
      `S3 ready (${env.region}, public=${env.bucketPublic}, private=${env.bucketPrivate})`,
    );
  }

  /** True se as env vars estão presentes e o cliente foi inicializado. */
  isReady(): boolean {
    return this.client !== null && this.env !== null;
  }

  // ─── Bucket público (avatares) ─────────────────────────────────────────────

  /** Constrói a URL pública directa (sem assinatura) para um objecto do bucket público. */
  buildPublicUrl(key: string): string {
    if (!this.env) {
      throw new AppException('STORAGE_NOT_READY', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return `https://${this.env.bucketPublic}.s3.${this.env.region}.amazonaws.com/${key}`;
  }

  /**
   * Põe um avatar já processado (WebP) no bucket público. Path canónico:
   * `avatars/{userPublicId}.webp`. Idempotente — overwrite por design (mesmo
   * key em cada upload, novo conteúdo).
   */
  async putAvatar(
    userPublicId: string,
    processedWebp: Buffer,
  ): Promise<string> {
    if (!this.client || !this.env) {
      throw new AppException('STORAGE_NOT_READY', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const key = `avatars/${userPublicId}.webp`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.env.bucketPublic,
        Key: key,
        Body: processedWebp,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=86400',
      }),
    );
    return key;
  }

  /**
   * Apaga um objecto pelo `key`. Silencioso quando o storage está desactivado
   * — é o caller que decide se quer suportar este caso.
   */
  async deletePublicObject(key: string): Promise<void> {
    if (!this.client || !this.env) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.env.bucketPublic, Key: key }),
    );
  }

  /** MIME types aceites para avatar — exposto para validação no UsersService. */
  static get allowedAvatarMime(): string[] {
    return [...this.ALLOWED_AVATAR_MIME];
  }

  /** Tamanho máximo permitido para avatar — exposto para validação no UsersService. */
  static get maxAvatarBytes(): number {
    return this.MAX_AVATAR_BYTES;
  }

  // ─── Bucket privado (uploads de ficheiros project-scoped) ──────────────────

  /**
   * Põe um buffer no bucket privado com o `key` exacto fornecido pelo caller.
   * O caller é responsável por construir o key (UUID v7 aleatório, sem
   * informação que indique propriedade — ver `FilesService.buildBucketKey`).
   *
   * Sem `CacheControl` aqui — todos os downloads passam por presigned URL com
   * TTL curto, não há cache pública.
   */
  async putPrivateObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!this.client || !this.env) {
      throw new AppException('STORAGE_NOT_READY', HttpStatus.SERVICE_UNAVAILABLE);
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.env.bucketPrivate,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /**
   * Apaga um objecto do bucket privado. Silencioso se o storage estiver
   * desactivado — o caller é responsável por logging/audit. Usado em:
   * - delete soft do `File` (best-effort cleanup)
   * - replace (apaga key antigo após put novo)
   * - GuardDuty INFECTED (apaga bytes mas preserva DB record)
   */
  async deletePrivateObject(key: string): Promise<void> {
    if (!this.client || !this.env) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.env.bucketPrivate, Key: key }),
    );
  }

  /**
   * Gera URL presigned para download. TTL default 15 minutos — curto o
   * suficiente para evitar abuso por partilha, longo o suficiente para um
   * download humano normal. URL contém `Signature` AWS — não revelar o key
   * pelo path, só pela URL gerada.
   *
   * Quando `originalName` é fornecido, injecta `ResponseContentDisposition`
   * no presigned — o S3 devolve esse header na resposta, fazendo o browser
   * descarregar o ficheiro com o nome original guardado no `File` (bucket
   * key continua sendo o UUID hash, opaco).
   *
   * Formato `filename*=UTF-8''<percent-encoded>` (RFC 5987 / 8187) suporta
   * acentos, espaços e qualquer caractere Unicode em browsers modernos
   * (Chrome, Firefox, Safari, Edge — todos pós-2015). Sem fallback ASCII
   * `filename=...` — modern-only por desenho.
   */
  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 900,
    originalName?: string,
  ): Promise<string> {
    if (!this.client || !this.env) {
      throw new AppException('STORAGE_NOT_READY', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const command = new GetObjectCommand({
      Bucket: this.env.bucketPrivate,
      Key: key,
      ...(originalName
        ? {
            ResponseContentDisposition: buildContentDisposition(originalName),
          }
        : {}),
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

/**
 * Constrói o header `Content-Disposition` para forçar download com nome
 * Unicode-safe. RFC 5987 §3.2 — `filename*` aceita charset + percent-encoding.
 * Strip de control chars (C0 + DEL) defensivo — `\r\n` num filename
 * poderia injectar headers HTTP extra (CRLF injection); o aws-sdk já valida
 * isto internamente mas defesa em camadas é grátis aqui.
 */
function buildContentDisposition(filename: string): string {
  // eslint-disable-next-line no-control-regex
  const sanitized = filename.replace(/[\u0000-\u001f\u007f]/g, '_');
  // encodeURIComponent é mais agressivo que o RFC permite, mas é sempre
  // correcto e seguro para qualquer caractere Unicode.
  return `attachment; filename*=UTF-8''${encodeURIComponent(sanitized)}`;
}
