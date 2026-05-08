import type { FileScanStatus } from '@prisma/client';

/**
 * DTO de resposta para um `File`. NUNCA expõe:
 * - `id` numérico interno
 * - `bucketKey` (resolvido via `/download` em presigned URL)
 * - `uploadedById` numérico (expõe `uploadedBy.publicId`)
 * - `projectId`/`taskId` numéricos
 *
 * Princípio: API pública só fala em `publicId` UUID v7. Path no bucket é
 * opaco e segue a regra "nada que indique propriedade no path".
 */
export interface FileResponseDto {
  publicId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: FileScanStatus | null;
  /** True se o `bucketKey` está sob `uploads/secured/`. Frontend usa para escudo. */
  isSecured: boolean;
  uploadedBy: { publicId: string; name: string } | null;
  uploadedAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  task: { publicId: string } | null;
}

/**
 * Resposta do endpoint `GET .../files/:fileId/download`. URL presigned com
 * TTL curto — frontend abre em nova janela. INFECTED ⇒ 403, não chega aqui.
 */
export interface FileDownloadResponseDto {
  url: string;
  expiresAt: string; // ISO 8601
}
