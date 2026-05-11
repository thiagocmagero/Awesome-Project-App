import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBase } from '../../lib/api';

export interface MissingTranslationItem {
  publicId: string;
  locale: string;
  namespace: string;
  key: string;
  seenAt: string;
  resolved: boolean;
}

export interface MissingStats {
  pending: number;
  resolved: number;
  byNamespace: Record<string, number>;
}

export interface UseMissingTranslationsFilters {
  resolved: boolean;
  namespace: string | null;
}

export interface UseMissingTranslationsResult {
  items: MissingTranslationItem[];
  total: number;
  stats: MissingStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshStats: () => Promise<void>;
  promote: (publicId: string) => Promise<{ namespace: string } | null>;
}

const EMPTY_STATS: MissingStats = { pending: 0, resolved: 0, byNamespace: {} };

export function useMissingTranslations(
  filters: UseMissingTranslationsFilters,
): UseMissingTranslationsResult {
  const api = getApiBase();
  const [items, setItems] = useState<MissingTranslationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<MissingStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const res = await apiFetch(`${api}/i18n/backoffice/missing/stats`);
      if (!res.ok) return;
      const data = (await res.json()) as MissingStats;
      setStats({
        pending: data.pending ?? 0,
        resolved: data.resolved ?? 0,
        byNamespace: data.byNamespace ?? {},
      });
    } catch {
      /* silent */
    }
  }, [api]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('resolved', filters.resolved ? 'true' : 'false');
      if (filters.namespace) params.set('namespace', filters.namespace);
      params.set('limit', '200');
      const res = await apiFetch(`${api}/i18n/backoffice/missing?${params.toString()}`);
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { items: MissingTranslationItem[]; total: number };
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [api, filters.resolved, filters.namespace]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const promote = useCallback(
    async (publicId: string): Promise<{ namespace: string } | null> => {
      try {
        const res = await apiFetch(`${api}/i18n/backoffice/missing/${publicId}/promote`, {
          method: 'POST',
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { namespace: string };
        // Optimistic remove
        setItems((prev) => prev.filter((i) => i.publicId !== publicId));
        setTotal((t) => Math.max(0, t - 1));
        // Sync stats
        refreshStats();
        return body;
      } catch {
        return null;
      }
    },
    [api, refreshStats],
  );

  return { items, total, stats, loading, error, refresh, refreshStats, promote };
}
