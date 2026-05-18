// Carrega detalhes do projeto via `GET /api/v1/projects/:id`.

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import type { IProjectDetail } from './types';

interface UseProjectResult {
  project: IProjectDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProject(projectPublicId: string | undefined): UseProjectResult {
  const [project, setProject] = useState<IProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectPublicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<IProjectDetail>(`/projects/${projectPublicId}`);
      setProject(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectPublicId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { project, loading, error, refresh };
}
