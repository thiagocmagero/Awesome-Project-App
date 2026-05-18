// Hook que gere Estados (BoardColumns) do projeto: lista + CRUD + reorder.
// Port adaptado de `frontend/src/features/planning/usePlanningStates.ts`:
//  - usa `apiGet/apiPost/apiPatch/apiFetch` do frontend2 (cookies HttpOnly).
//  - omite `updateStateRules` e `swimlanes` (fora de scope da Lista — Mai 2026).
//  - normaliza `labelKey` legacy (`column.todo` etc.) para namespace planning.

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch, apiGet, apiPatch, apiPost, getApiBase } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { IFieldRule, ITaskState } from './states-types';

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
  rules?: IFieldRule[];
}

interface UsePlanningStatesResult {
  states: ITaskState[];
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
  const { showToast } = useToast();
  const { t } = useTranslation('planning');

  const [states, setStates] = useState<ITaskState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectPublicId) {
      setLoading(false);
      return;
    }
    try {
      const raw = await apiGet<RawState[]>(`/projects/${projectPublicId}/planning/states`);
      setStates(
        (Array.isArray(raw) ? raw : []).map((s) => ({
          ...s,
          labelKey: normalizeLabelKey(s.labelKey),
          rules: s.rules ?? [],
        })),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectPublicId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function createState(label: string, color?: string, wipLimit?: number): Promise<boolean> {
    if (!projectPublicId) return false;
    try {
      await apiPost(`/projects/${projectPublicId}/planning/states`, { label, color, wipLimit });
      await refresh();
      return true;
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
      await apiPatch(`/projects/${projectPublicId}/planning/states/${statePublicId}`, patch);
      await refresh();
      return true;
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
    // apiDelete não aceita body — usar apiFetch directamente para passar
    // `targetStatePublicId` (regra do backend para mover tarefas).
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${projectPublicId}/planning/states/${statePublicId}`,
        {
          method: 'DELETE',
          body: JSON.stringify(targetStatePublicId ? { targetStatePublicId } : {}),
        },
      );
      if (res.ok) {
        await refresh();
        return { ok: true };
      }
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as { message?: string })?.message ?? `HTTP ${res.status}` };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async function reorderStates(orderedPublicIds: string[]): Promise<boolean> {
    if (!projectPublicId) return false;
    try {
      await apiPatch(`/projects/${projectPublicId}/planning/states/reorder`, { orderedPublicIds });
      await refresh();
      return true;
    } catch {
      await refresh();
      return false;
    }
  }

  return { states, loading, error, refresh, createState, updateState, deleteState, reorderStates };
}
