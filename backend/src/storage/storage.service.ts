import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
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
 * Pipeline aceite (validação MIME real + reprocessamento) vive no
 * `UsersService.updateMyAvatar`. Este service apenas:
 *   1. Põe um buffer já processado no bucket público.
 *   2. Apaga objectos por key.
 *   3. Constrói a URL pública para um `key`.
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
      `S3 ready (${env.region}, public bucket=${env.bucketPublic})`,
    );
  }

  /** True se as env vars estão presentes e o cliente foi inicializado. */
  isReady(): boolean {
    return this.client !== null && this.env !== null;
  }

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
}
