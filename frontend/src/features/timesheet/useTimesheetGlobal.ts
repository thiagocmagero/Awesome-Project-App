/**
 * useTimesheetGlobal — área global /timesheets.
 * Dois modos:
 *   - 'my'        → próprias semanas em todos os projectos.
 *   - 'approvals' → fila de aprovação (cross-project, se user tem TIMESHEET_APPROVE em ≥1).
 *
 * Filtros são INDEPENDENTES por modo (cada chamada do hook tem o seu state).
 * Refinamento do utilizador: aprovação na área global é só por semana inteira.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiBase, apiFetch } from '../../lib/api';
import type { ITimesheetMyRow, ITimesheetApprovalRow, TimesheetWeekStatus } from './types';

export interface GlobalFilters {
  projectPublicId: string | null;
  weekStart:       string | null;       // 'YYYY-MM-DD'
  status:          TimesheetWeekStatus | null;
  /** Apenas no modo 'approvals' */
  userPublicId?:   string | null;
}

export const EMPTY_FILTERS: GlobalFilters = {
  projectPublicId: null,
  weekStart:       null,
  status:          null,
  userPublicId:    null,
};

export function useTimesheetApprovalAccess() {
  const { token } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [loading, setLoading]     = useState<boolean>(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const res = await apiFetch(`${getApiBase()}/timesheets/has-approval-access`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = (await res.json()) as { hasAccess: boolean };
          setHasAccess(!!json.hasAccess);
        }
      } catch (e) {
        console.error('[useTimesheetApprovalAccess] failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return { hasAccess, loading };
}

interface GlobalMyState {
  rows:    ITimesheetMyRow[];
  loading: boolean;
  error:   string | null;
}

export function useTimesheetGlobalMy(filters: GlobalFilters) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('timesheet');

  const [state, setState] = useState<GlobalMyState>({ rows: [], loading: false, error: null });

  const fetchRows = useCallback(async () => {
    if (!token) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const url = new URL(`${getApiBase()}/timesheets/my`, window.location.origin);
      if (filters.weekStart) url.searchParams.set('weekStart', filters.weekStart);
      if (filters.projectPublicId) url.searchParams.set('projectId', filters.projectPublicId);
      if (filters.status) url.searchParams.set('status', filters.status);
      const res = await apiFetch(url.pathname + url.search, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setState({ rows: (await res.json()) as ITimesheetMyRow[], loading: false, error: null });
      } else {
        setState({ rows: [], loading: false, error: `HTTP ${res.status}` });
        if (res.status !== 403) showToast('danger', t('global.error.load_failed'));
      }
    } catch (e) {
      console.error('[useTimesheetGlobalMy] failed:', e);
      setState({ rows: [], loading: false, error: String(e) });
      showToast('danger', t('global.error.load_failed'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters.weekStart, filters.projectPublicId, filters.status]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  return { ...state, refresh: fetchRows };
}

interface GlobalApprovalsState {
  rows:    ITimesheetApprovalRow[];
  loading: boolean;
  error:   string | null;
}

export function useTimesheetGlobalApprovals(filters: GlobalFilters) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('timesheet');

  const [state, setState] = useState<GlobalApprovalsState>({ rows: [], loading: false, error: null });

  const fetchRows = useCallback(async () => {
    if (!token) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const url = new URL(`${getApiBase()}/timesheets/pending-approvals`, window.location.origin);
      if (filters.weekStart) url.searchParams.set('weekStart', filters.weekStart);
      if (filters.projectPublicId) url.searchParams.set('projectId', filters.projectPublicId);
      if (filters.status) url.searchParams.set('status', filters.status);
      if (filters.userPublicId) url.searchParams.set('userId', filters.userPublicId);
      const res = await apiFetch(url.pathname + url.search, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setState({ rows: (await res.json()) as ITimesheetApprovalRow[], loading: false, error: null });
      } else {
        setState({ rows: [], loading: false, error: `HTTP ${res.status}` });
        if (res.status !== 403) showToast('danger', t('global.error.load_failed'));
      }
    } catch (e) {
      console.error('[useTimesheetGlobalApprovals] failed:', e);
      setState({ rows: [], loading: false, error: String(e) });
      showToast('danger', t('global.error.load_failed'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters.weekStart, filters.projectPublicId, filters.status, filters.userPublicId]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function approveWeek(row: ITimesheetApprovalRow): Promise<boolean> {
    if (!token) return false;
    try {
      const res = await apiFetch(`${getApiBase()}/timesheets/approvals/week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projectPublicId: row.project.publicId,
          userPublicId:    row.user.publicId,
          weekStart:       row.weekStart,
        }),
      });
      if (res.ok) {
        await fetchRows();
        showToast('success', t('success.week_approved'));
        return true;
      }
      showToast('danger', t('errors.save_failed'));
      return false;
    } catch (e) {
      console.error('[useTimesheetGlobalApprovals] approveWeek failed:', e);
      return false;
    }
  }

  async function rejectWeek(row: ITimesheetApprovalRow, reason: string): Promise<boolean> {
    if (!token) return false;
    try {
      const res = await apiFetch(`${getApiBase()}/timesheets/rejections/week`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projectPublicId: row.project.publicId,
          userPublicId:    row.user.publicId,
          weekStart:       row.weekStart,
          reason,
        }),
      });
      if (res.ok) {
        await fetchRows();
        showToast('success', t('success.week_rejected'));
        return true;
      }
      showToast('danger', t('errors.save_failed'));
      return false;
    } catch (e) {
      console.error('[useTimesheetGlobalApprovals] rejectWeek failed:', e);
      return false;
    }
  }

  return { ...state, refresh: fetchRows, approveWeek, rejectWeek };
}
