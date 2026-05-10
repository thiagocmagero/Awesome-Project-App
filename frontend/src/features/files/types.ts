/**
 * Tipos partilhados pelos componentes da feature `files`. Espelham o
 * `FileResponseDto` do backend (publicId everywhere, sem bucketKey).
 */

export type FileScanStatus = 'PENDING' | 'CLEAN' | 'INFECTED';

export interface AppFile {
  publicId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: FileScanStatus | null;
  /** True se o ficheiro está em path secured (relevante para mostrar escudo). */
  isSecured: boolean;
  uploadedBy: {
    publicId: string;
    name: string;
    /** URL pública completa do avatar ou null (UI mostra iniciais quando null). */
    avatarUrl: string | null;
    /** ISO 8601 — usado para cache-busting via `?v=` no `<img src>`. */
    avatarUpdatedAt: string | null;
  } | null;
  uploadedAt: string;
  updatedAt: string;
  task: { publicId: string } | null;
}

export interface FileDownloadInfo {
  url: string;
  expiresAt: string;
}

export interface UploadsAvailability {
  available: boolean;
}
