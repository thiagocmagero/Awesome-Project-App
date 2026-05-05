// Hook que carrega Estados (colunas) e Swimlanes do projecto via
// `/projects/:id/planning/states/*` e `/projects/:id/planning/swimlanes/*`.
// Substitui o antigo `useBoardData` do Board removido em Abril 2026 — só expõe
// o que o Planning ainda precisa: lista de estados (alimentando o select do
// TaskModal, chips de filtro, offcanvas Gerir Estados) + CRUD de estados +
// reorder. Sem cards/move/assign.
//
// Nota: o backend continua a chamar a tabela `BoardColumn`. O `labelKey` dos
// estados sistema vinha como `column.todo|inprogress|done` (namespace board).
// Aqui normalizamos para o namespace `planning` (`states.todo` etc.) — dessa
// forma os consumidores (StateBadge, TaskModal, UnifiedToolbar) podem usar
// directamente `t(labelKey)` no namespace `planning`.
import { useEffect, useState, useCallback } from 'react';
import { getApiBase, apiFetch } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import type { ITaskState, ITaskSwimlane } from './states-types';

const SYSTEM_LABEL_KEY_MAP: Record<string, string> = {
  'column.todo':       'states.todo',
  'column.inprogress': 'states.inprogress',
  'column.done':       'states.done',
};

function normalizeLabelKey(raw: string | null): string | null {
  if (!raw) return null;
  return SYSTEM_LABEL_KEY_MAP[raw] ?? raw;
}

interface RawState {
  publicId: string;
  label: string | null;
  labelKey: string | null;
  systemKey: string | null;
  type: 'INITIAL' | 'INTERMEDIATE' | 'FINAL';
  isSystem: boolean;
  position: number;
  color: string | null;
  wipLimit: number | null;
}

interface RawSwimlane {
  publicId: string;
  label: string | null;
  labelKey: string | null;
  isPrimary: boolean;
  color: string | null;
  position: number;
  collapsed: boolean;
}

interface UsePlanningStatesResult {
  states: ITaskState[];
  swimlanes: ITaskSwimlane[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createState: (label: string, color?: string, wipLimit?: number) => Promise<boolean>;
  updateState: (
    statePublicId: string,
    patch: { label?: string | null; color?: string | null; wipLimit?: number | null },
  ) => Promise<boolean>;
  deleteState: (
    statePublicId: string,
    targetStatePublicId?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  reorderStates: (orderedPublicIds: string[]) => Promise<boolean>;
}

export function usePlanningStates(projectPublicId: string | undefined): UsePlanningStatesResult {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('planning');
  const api = getApiBase();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [states,    setStates]    = useState<ITaskState[]>([]);
  const [swimlanes, setSwimlanes] = useState<ITaskSwimlane[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectPublicId) return;
    try {
      const [resStates, resSw] = await Promise.all([
        apiFetch(`${api}/projects/${projectPublicId}/planning/states`, { headers }),
        apiFetch(`${api}/projects/${projectPublicId}/planning/swimlanes`, { headers }),
      ]);
      if (!resStates.ok) throw new Error('Failed to load states');
      const rawStates: RawState[] = await resStates.json();
      const rawSwimlanes: RawSwimlane[] = resSw.ok ? await resSw.json() : [];
      setStates(rawStates.map((s) => ({ ...s, labelKey: normalizeLabelKey(s.labelKey) })));
      setSwimlanes(rawSwimlanes.map((s) => ({ ...s, labelKey: normalizeLabelKey(s.labelKey) })));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // headers/token mudam por render; intencionalmente fora do dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, projectPublicId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  async function createState(label: string, color?: string, wipLimit?: number): Promise<boolean> {
    if (!projectPublicId) return false;
    try {
      const res = await apiFetch(`${api}/projects/${projectPublicId}/planning/states`, {
        method: 'POST', headers,
        body: JSON.stringify({ label, color, wipLimit }),
      });
      if (res.ok) { await refresh(); return true; }
      showToast('danger', t('states.error.create'));
      return false;
    } catch {
      showToast('danger', t('states.error.create'));
      return false;
    }
  }

  async function updateState(
    statePublicId: string,
    patch: { label?: string | null; color?: string | null; wipLimit?: number | null },
  ): Promise<boolean> {
    if (!projectPublicId) return false;
    try {
      const res = await apiFetch(`${api}/projects/${projectPublicId}/planning/states/${statePublicId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify(patch),
      });
      if (res.ok) { await refresh(); return true; }
      showToast('danger', t('states.error.update'));
      return false;
    } catch {
      showToast('danger', t('states.error.update'));
      return false;
    }
  }

  async function deleteState(
    statePublicId: string,
    targetStatePublicId?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!projectPublicId) return { ok: false };
    try {
      const res = await apiFetch(`${api}/projects/${projectPublicId}/planning/states/${statePublicId}`, {
        method: 'DELETE', headers,
        body: JSON.stringify(targetStatePublicId ? { targetStatePublicId } : {}),
      });
      if (res.ok) { await refresh(); return { ok: true }; }
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.message ?? `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async function reorderStates(orderedPublicIds: string[]): Promise<boolean> {
    if (!projectPublicId) return false;
    try {
      const res = await apiFetch(`${api}/projects/${projectPublicId}/planning/states/reorder`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ orderedPublicIds }),
      });
      if (res.ok) { await refresh(); return true; }
      await refresh();
      return false;
    } catch {
      await refresh();
      return false;
    }
  }

  return { states, swimlanes, loading, error, refresh, createState, updateState, deleteState, reorderStates };
}
