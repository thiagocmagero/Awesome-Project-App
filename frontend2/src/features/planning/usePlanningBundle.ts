// Carrega bundle de planning via `GET /api/v1/projects/:id/planning`.
// Versão enxuta de `usePlanningData` do legacy — só o que a Lista precisa.

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import type { IPlanningBundle, ITask, ITaskLink, IResourceNode } from './types';

interface UsePlanningBundleResult {
  tasks: ITask[];
  links: ITaskLink[];
  resources: IResourceNode[];
  nonWorkingDays: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlanningBundle(projectPublicId: string | undefined): UsePlanningBundleResult {
  const [bundle, setBundle] = useState<IPlanningBundle>({
    data: [], links: [], resources: [], nonWorkingDays: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectPublicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<IPlanningBundle>(`/projects/${projectPublicId}/planning`);
      setBundle({
        data: Array.isArray(data?.data) ? data.data : [],
        links: Array.isArray(data?.links) ? data.links : [],
        resources: Array.isArray(data?.resources) ? data.resources : [],
        nonWorkingDays: Array.isArray(data?.nonWorkingDays) ? data.nonWorkingDays : [],
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectPublicId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return {
    tasks: bundle.data,
    links: bundle.links,
    resources: bundle.resources,
    nonWorkingDays: bundle.nonWorkingDays,
    loading,
    error,
    refresh,
  };
}
