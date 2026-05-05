/**
 * useTimesheetData — fetch da semana + mutações próprias (entries, submit, copy).
 * Espelha o padrão de useCalendarData.ts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiBase, apiFetch } from '../../lib/api';
import type { CopyWeekMode, ITimesheetBundle } from './types';

const EMPTY_BUNDLE: ITimesheetBundle = {
  week:    { publicId: '', weekStart: '', status: 'DRAFT', submittedAt: null },
  days:    [],
  entries: [],
  tasks:   [],
  member:  null,
};

export function useTimesheetData(
  projectPublicId: string | undefined,
  weekStart: string | null,
  viewedUserPublicId: string | null,
) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t }     = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  const [data, setData]       = useState<ITimesheetBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const firstLoad = useRef(true);

  async function resolveApiError(res: Response, fallback: string): Promise<string> {
    const body: { error_code?: string; message?: string | string[] } = await res.json().catch(() => ({}));
    if (typeof body.error_code === 'string' && body.error_code) {
      const tsKey = `errors.${body.error_code.toLowerCase()}` as const;
      const translated = t(tsKey as Parameters<typeof t>[0]);
      if (translated && translated !== tsKey) return translated;
      return tc(`errors.${body.error_code.toLowerCase()}` as Parameters<typeof tc>[0]);
    }
    if (Array.isArray(body.message)) return body.message.join(' · ');
    if (typeof body.message === 'string') return body.message;
    return fallback;
  }

  const fetchWeek = useCallback(async () => {
    if (!token || !projectPublicId || !weekStart) return;
    if (firstLoad.current) setLoading(true);
    setError(null);
    try {
      const api = getApiBase();
      const url = new URL(`${api}/projects/${encodeURIComponent(projectPublicId)}/timesheets/week`, window.location.origin);
      url.searchParams.set('weekStart', weekStart);
      if (viewedUserPublicId) url.searchParams.set('userId', viewedUserPublicId);
      const res = await apiFetch(url.pathname + url.search, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        if (res.status !== 403) showToast('danger', t('errors.load_failed'));
        return;
      }
      setData((await res.json()) as ITimesheetBundle);
    } catch (e) {
      console.error('[useTimesheetData] fetchWeek failed:', e);
      setError(String(e));
      showToast('danger', t('errors.load_failed'));
    } finally {
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectPublicId, weekStart, viewedUserPublicId]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  // ── Mutações ───────────────────────────────────────────────────────────────

  async function upsertEntry(payload: {
    taskPublicId: string;
    workDate: string;          // 'YYYY-MM-DD'
    hours: number;
    comment?: string | null;
  }): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/entries`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) { await fetchWeek(); return true; }
      showToast('danger', await resolveApiError(res, t('errors.save_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetData] upsertEntry failed:', e);
      showToast('danger', t('errors.save_failed'));
      return false;
    }
  }

  async function updateEntry(entryPublicId: string, patch: { hours?: number; comment?: string | null }): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/entries/${encodeURIComponent(entryPublicId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(patch),
        },
      );
      if (res.ok) { await fetchWeek(); return true; }
      showToast('danger', await resolveApiError(res, t('errors.save_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetData] updateEntry failed:', e);
      showToast('danger', t('errors.save_failed'));
      return false;
    }
  }

  async function deleteEntry(entryPublicId: string): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/entries/${encodeURIComponent(entryPublicId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) { await fetchWeek(); return true; }
      showToast('danger', await resolveApiError(res, t('errors.delete_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetData] deleteEntry failed:', e);
      showToast('danger', t('errors.delete_failed'));
      return false;
    }
  }

  async function deleteRow(taskPublicId: string): Promise<boolean> {
    if (!token || !projectPublicId || !weekStart) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/rows`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ taskPublicId, weekStart }),
        },
      );
      if (res.ok) { await fetchWeek(); return true; }
      showToast('danger', await resolveApiError(res, t('errors.delete_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetData] deleteRow failed:', e);
      showToast('danger', t('errors.delete_failed'));
      return false;
    }
  }

  async function submitWeek(): Promise<boolean> {
    if (!token || !projectPublicId || !weekStart) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ weekStart }),
        },
      );
      if (res.ok) {
        await fetchWeek();
        showToast('success', t('success.week_submitted'));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.submit_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetData] submitWeek failed:', e);
      showToast('danger', t('errors.submit_failed'));
      return false;
    }
  }

  /**
   * "Editar semana" — utilizador reverte os próprios dias SUBMITTED para DRAFT
   * (só se a semana ainda não foi aprovada/rejeitada). Cria audit log com
   * action=REVERT, scope=WEEK no backend. Sem notificações.
   */
  async function unsubmitWeek(): Promise<boolean> {
    if (!token || !projectPublicId || !weekStart) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/unsubmit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ weekStart }),
        },
      );
      if (res.ok) {
        await fetchWeek();
        showToast('success', t('success.week_unsubmitted'));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.unsubmit_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetData] unsubmitWeek failed:', e);
      showToast('danger', t('errors.unsubmit_failed'));
      return false;
    }
  }

  async function copyWeek(payload: {
    fromWeekStart: string;
    toWeekStart:   string;
    mode:          CopyWeekMode;
    overwrite?:    boolean;
  }): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/copy-week`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        await fetchWeek();
        const out = (await res.json().catch(() => ({}))) as { created?: number; skipped?: number };
        showToast('success', t('success.week_copied', {
          created: out.created ?? 0, skipped: out.skipped ?? 0,
        }));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.copy_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetData] copyWeek failed:', e);
      showToast('danger', t('errors.copy_failed'));
      return false;
    }
  }

  return {
    data,
    loading,
    error,
    refresh: fetchWeek,
    upsertEntry,
    updateEntry,
    deleteEntry,
    deleteRow,
    submitWeek,
    unsubmitWeek,
    copyWeek,
  };
}
