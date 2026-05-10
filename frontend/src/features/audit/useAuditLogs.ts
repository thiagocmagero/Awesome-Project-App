import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, getApiBase } from '../../lib/api';
import type { AuditFilters, AuditLogEntry, PageMeta } from './types';
import { EMPTY_FILTERS } from './types';

interface UseAuditLogsOptions {
  /** Path absoluto sem prefixo `/api/v1` (ex: `/audit-logs` ou `/audit-logs/by-client/{publicId}`). */
  endpoint: string;
  /** Default 10. */
  defaultLimit?: number;
}

interface UseAuditLogsState {
  data: AuditLogEntry[];
  meta: PageMeta;
  filters: AuditFilters;
  /** Filtros pendentes — ainda não aplicados. */
  draftFilters: AuditFilters;
  loading: boolean;
  error: string | null;
}

interface UseAuditLogsReturn extends UseAuditLogsState {
  setDraftFilter: <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  refresh: () => void;
}

const INITIAL_META: PageMeta = { total: 0, page: 1, limit: 10, totalPages: 1 };

function buildQuery(filters: AuditFilters, page: number, limit: number): string {
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  sp.set('limit', String(limit));
  if (filters.url) sp.set('url', filters.url);
  if (filters.method) sp.set('method', filters.method);
  if (filters.status) sp.set('status', filters.status);
  if (filters.statusCode) sp.set('statusCode', filters.statusCode);
  if (filters.action) sp.set('action', filters.action);
  if (filters.resourceType) sp.set('resourceType', filters.resourceType);
  if (filters.userId) sp.set('userId', filters.userId);
  if (filters.ip) sp.set('ip', filters.ip);
  if (filters.startDate) sp.set('startDate', new Date(filters.startDate).toISOString());
  if (filters.endDate) sp.set('endDate', new Date(filters.endDate).toISOString());
  return sp.toString();
}

export function useAuditLogs({ endpoint, defaultLimit = 10 }: UseAuditLogsOptions): UseAuditLogsReturn {
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ ...INITIAL_META, limit: defaultLimit });
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [page, setPageState] = useState(1);
  const [limit, setLimitState] = useState(defaultLimit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  const fetchLogs = useCallback(async () => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery(filters, page, limit);
      const res = await apiFetch(`${getApiBase()}${endpoint}?${qs}`);
      if (id !== reqIdRef.current) return; // request superseded
      if (!res.ok) {
        setData([]);
        setMeta({ ...INITIAL_META, limit, page });
        setError(`HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as { data: AuditLogEntry[]; meta: PageMeta };
      if (id !== reqIdRef.current) return;
      setData(json.data ?? []);
      setMeta(json.meta ?? { ...INITIAL_META, limit, page });
    } catch (err) {
      if (id !== reqIdRef.current) return;
      setError((err as Error).message ?? 'unknown');
      setData([]);
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, [endpoint, filters, page, limit]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return {
    data,
    meta,
    filters,
    draftFilters,
    loading,
    error,
    setDraftFilter: (key, value) => {
      setDraftFilters((prev) => ({ ...prev, [key]: value }));
    },
    applyFilters: () => {
      setFilters(draftFilters);
      setPageState(1); // reset à página 1 quando filtros mudam
    },
    clearFilters: () => {
      setDraftFilters(EMPTY_FILTERS);
      setFilters(EMPTY_FILTERS);
      setPageState(1);
    },
    setPage: (p) => setPageState(Math.max(1, p)),
    setLimit: (l) => {
      setLimitState(l);
      setPageState(1);
    },
    refresh: () => void fetchLogs(),
  };
}
