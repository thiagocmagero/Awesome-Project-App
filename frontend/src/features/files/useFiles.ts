import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, getApiBase } from '../../lib/api';
import type { AppFile, FileDownloadInfo, UploadsAvailability } from './types';

interface UseFilesOpts {
  projectPublicId: string | null;
  /** Se definido, lista apenas ficheiros desta task. */
  taskPublicId?: string | null;
  /** Se 'project', lista apenas ficheiros project-level (sem task). */
  scope?: 'project' | 'all';
  /** Não fazer fetch enquanto false (ex.: tab inactivo). Default `true`. */
  enabled?: boolean;
}

export interface UseFilesResult {
  files: AppFile[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upload: (file: File) => Promise<AppFile | null>;
  replace: (filePublicId: string, file: File) => Promise<AppFile | null>;
  rename: (filePublicId: string, newName: string) => Promise<AppFile | null>;
  remove: (filePublicId: string) => Promise<boolean>;
  getDownloadUrl: (filePublicId: string) => Promise<FileDownloadInfo | null>;
}

/**
 * Hook React para CRUD de ficheiros num projecto + (opcional) task.
 *
 * Padrão: optimistic em delete/rename; pessimistic em upload/replace
 * (depende de validação MIME no servidor — não vale a pena adivinhar).
 */
export function useFiles(opts: UseFilesOpts): UseFilesResult {
  const [files, setFiles] = useState<AppFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  const fetchList = useCallback(async () => {
    const { projectPublicId, taskPublicId, scope, enabled } = optsRef.current;
    if (enabled === false) return;
    if (!projectPublicId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (taskPublicId) params.set('taskPublicId', taskPublicId);
      else if (scope === 'project') params.set('scope', 'project');
      const qs = params.toString();
      const url = `${getApiBase()}/projects/${projectPublicId}/files${qs ? `?${qs}` : ''}`;
      const res = await apiFetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error_code ?? `HTTP_${res.status}`);
        setFiles([]);
        return;
      }
      const data: AppFile[] = await res.json();
      setFiles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [
    fetchList,
    opts.projectPublicId,
    opts.taskPublicId,
    opts.scope,
    opts.enabled,
  ]);

  const upload = useCallback(
    async (file: File): Promise<AppFile | null> => {
      const { projectPublicId, taskPublicId } = optsRef.current;
      if (!projectPublicId) return null;
      const fd = new FormData();
      fd.append('file', file);
      if (taskPublicId) fd.append('taskPublicId', taskPublicId);
      const res = await apiFetch(
        `${getApiBase()}/projects/${projectPublicId}/files`,
        { method: 'POST', body: fd },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Serializa o body completo no .message — o caller faz parse para
        // extrair `error_code` + contexto (extension, mime, max_mb, ...).
        const payload = data && typeof data === 'object'
          ? { error_code: data.error_code ?? `HTTP_${res.status}`, ...data }
          : { error_code: `HTTP_${res.status}` };
        throw new Error(JSON.stringify(payload));
      }
      const created: AppFile = await res.json();
      setFiles((curr) => [created, ...curr]);
      return created;
    },
    [],
  );

  const replace = useCallback(
    async (filePublicId: string, file: File): Promise<AppFile | null> => {
      const { projectPublicId } = optsRef.current;
      if (!projectPublicId) return null;
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(
        `${getApiBase()}/projects/${projectPublicId}/files/${filePublicId}/replace`,
        { method: 'POST', body: fd },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Serializa o body completo no .message — o caller faz parse para
        // extrair `error_code` + contexto (extension, mime, max_mb, ...).
        const payload = data && typeof data === 'object'
          ? { error_code: data.error_code ?? `HTTP_${res.status}`, ...data }
          : { error_code: `HTTP_${res.status}` };
        throw new Error(JSON.stringify(payload));
      }
      const updated: AppFile = await res.json();
      setFiles((curr) =>
        curr.map((f) => (f.publicId === filePublicId ? updated : f)),
      );
      return updated;
    },
    [],
  );

  const rename = useCallback(
    async (filePublicId: string, newName: string): Promise<AppFile | null> => {
      const { projectPublicId } = optsRef.current;
      if (!projectPublicId) return null;
      const trimmed = newName.trim();
      if (!trimmed) return null;
      const res = await apiFetch(
        `${getApiBase()}/projects/${projectPublicId}/files/${filePublicId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ originalName: trimmed }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Serializa o body completo no .message — o caller faz parse para
        // extrair `error_code` + contexto (extension, mime, max_mb, ...).
        const payload = data && typeof data === 'object'
          ? { error_code: data.error_code ?? `HTTP_${res.status}`, ...data }
          : { error_code: `HTTP_${res.status}` };
        throw new Error(JSON.stringify(payload));
      }
      const updated: AppFile = await res.json();
      setFiles((curr) =>
        curr.map((f) => (f.publicId === filePublicId ? updated : f)),
      );
      return updated;
    },
    [],
  );

  const remove = useCallback(
    async (filePublicId: string): Promise<boolean> => {
      const { projectPublicId } = optsRef.current;
      if (!projectPublicId) return false;
      // Optimistic: remove first; revert on error.
      const previous = files;
      setFiles((curr) => curr.filter((f) => f.publicId !== filePublicId));
      const res = await apiFetch(
        `${getApiBase()}/projects/${projectPublicId}/files/${filePublicId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        setFiles(previous);
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error_code ?? `HTTP_${res.status}`);
      }
      return true;
    },
    [files],
  );

  const getDownloadUrl = useCallback(
    async (filePublicId: string): Promise<FileDownloadInfo | null> => {
      const { projectPublicId } = optsRef.current;
      if (!projectPublicId) return null;
      const res = await apiFetch(
        `${getApiBase()}/projects/${projectPublicId}/files/${filePublicId}/download`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Serializa o body completo no .message — o caller faz parse para
        // extrair `error_code` + contexto (extension, mime, max_mb, ...).
        const payload = data && typeof data === 'object'
          ? { error_code: data.error_code ?? `HTTP_${res.status}`, ...data }
          : { error_code: `HTTP_${res.status}` };
        throw new Error(JSON.stringify(payload));
      }
      return (await res.json()) as FileDownloadInfo;
    },
    [],
  );

  return {
    files,
    loading,
    error,
    refresh: fetchList,
    upload,
    replace,
    rename,
    remove,
    getDownloadUrl,
  };
}

/**
 * Hook auxiliar para o gate da UI dos uploads. Lê
 * `GET /platform-config/uploads/availability` (combina storage ready +
 * flag `upload` activo para o user). Devolve `null` enquanto carrega.
 */
export function useUploadsAvailability(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(
          `${getApiBase()}/platform-config/uploads/availability`,
        );
        if (!res.ok) {
          if (!cancelled) setAvailable(false);
          return;
        }
        const data = (await res.json()) as UploadsAvailability;
        if (!cancelled) setAvailable(!!data.available);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return available;
}
