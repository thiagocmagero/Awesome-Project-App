// Port literal de `frontend/src/features/files/errors.ts` (regra 4).
// Backend `AppException` serializa o body com `{ error_code, ...context }`.
// O `useFiles` propaga o body completo via `throw new Error(JSON.stringify(...))`.

export interface UploadErrorContext {
  error_code: string;
  extension?: string | null;
  mime?: string;
  allowed_extensions?: string[];
  allowed_mimes?: string[];
  max_mb?: number;
  size_mb?: number;
}

export function parseErrorContext(err: unknown): UploadErrorContext {
  if (!(err instanceof Error)) return { error_code: 'UPLOAD_FAILED' };
  try {
    const parsed = JSON.parse(err.message);
    if (parsed && typeof parsed === 'object' && typeof parsed.error_code === 'string') {
      return parsed as UploadErrorContext;
    }
  } catch {
    /* não é JSON — formato legado, plain string */
  }
  return { error_code: err.message || 'UPLOAD_FAILED' };
}

export function formatUploadError(
  t: (key: string, vars?: Record<string, unknown>) => string,
  ctx: UploadErrorContext,
): string {
  switch (ctx.error_code) {
    case 'FILE_TOO_LARGE_PLATFORM':
      return t('errors.file_too_large', {
        sizeMb: ctx.size_mb ?? '?',
        maxMb: ctx.max_mb ?? '?',
      });
    case 'MIME_NOT_ALLOWED':
      return t('errors.mime_not_allowed', {
        mime: ctx.mime ?? '?',
        allowed: (ctx.allowed_mimes ?? []).join(', ') || '—',
      });
    case 'EXTENSION_NOT_ALLOWED':
      return t('errors.extension_not_allowed', {
        ext: ctx.extension ?? '?',
        allowed: (ctx.allowed_extensions ?? []).join(', ') || '—',
      });
    case 'UNRECOGNIZED_FILE_TYPE':
      return t('errors.unrecognized', { ext: ctx.extension ?? '' });
    case 'FILE_MISSING':
      return t('errors.file_missing');
    case 'STORAGE_NOT_READY':
      return t('errors.storage_unavailable');
    case 'FILE_INFECTED_BLOCKED':
      return t('errors.infected');
    default:
      return t('errors.upload_failed');
  }
}
