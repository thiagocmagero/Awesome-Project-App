/**
 * useTimesheetTeam — vista do gestor dentro do projecto.
 * - Lista a equipa para a semana activa (status + total de horas).
 * - Aprovar dia/semana/mês, rejeitar dia.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiBase, apiFetch } from '../../lib/api';
import type { ITimesheetTeamData, TimesheetWeekStatus } from './types';

const EMPTY: ITimesheetTeamData = {
  rows:   [],
  counts: { all: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0, PARTIAL: 0, DRAFT: 0 },
};

export function useTimesheetTeam(
  projectPublicId: string | undefined,
  weekStart: string | null,
  enabled: boolean,
) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t }     = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  const [data, setData]       = useState<ITimesheetTeamData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState<'all' | TimesheetWeekStatus>('all');

  async function resolveApiError(res: Response, fallback: string): Promise<string> {
    const body: { error_code?: string; message?: string | string[] } = await res.json().catch(() => ({}));
    if (typeof body.error_code === 'string') return tc(`errors.${body.error_code.toLowerCase()}` as Parameters<typeof tc>[0]);
    if (Array.isArray(body.message)) return body.message.join(' · ');
    if (typeof body.message === 'string') return body.message;
    return fallback;
  }

  const fetchTeam = useCallback(async () => {
    if (!token || !projectPublicId || !weekStart || !enabled) return;
    setLoading(true);
    try {
      const url = new URL(`${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/team`, window.location.origin);
      url.searchParams.set('weekStart', weekStart);
      if (filter !== 'all') url.searchParams.set('status', filter);
      const res = await apiFetch(url.pathname + url.search, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData((await res.json()) as ITimesheetTeamData);
      } else if (res.status !== 403) {
        showToast('danger', t('errors.load_failed'));
      }
    } catch (e) {
      console.error('[useTimesheetTeam] fetchTeam failed:', e);
      showToast('danger', t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectPublicId, weekStart, filter, enabled]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  // ── Mutações de aprovação ──────────────────────────────────────────────────

  async function approveDay(userPublicId: string, workDate: string): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/approvals/day`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userPublicId, workDate }),
        },
      );
      if (res.ok) {
        await fetchTeam();
        showToast('success', t('success.day_approved'));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.save_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetTeam] approveDay failed:', e);
      return false;
    }
  }

  async function approveWeek(userPublicId: string, weekStartArg: string): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/approvals/week`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userPublicId, weekStart: weekStartArg }),
        },
      );
      if (res.ok) {
        await fetchTeam();
        showToast('success', t('success.week_approved'));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.save_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetTeam] approveWeek failed:', e);
      return false;
    }
  }

  async function approveMonth(userPublicId: string, year: number, month: number): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/approvals/month`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userPublicId, year, month }),
        },
      );
      if (res.ok) {
        await fetchTeam();
        showToast('success', t('success.month_approved'));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.save_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetTeam] approveMonth failed:', e);
      return false;
    }
  }

  async function rejectDay(userPublicId: string, workDate: string, reason: string): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/rejections/day`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userPublicId, workDate, reason }),
        },
      );
      if (res.ok) {
        await fetchTeam();
        showToast('success', t('success.day_rejected'));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.save_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetTeam] rejectDay failed:', e);
      return false;
    }
  }

  async function revertWeek(userPublicId: string, weekStartArg: string): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/revert/week`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userPublicId, weekStart: weekStartArg }),
        },
      );
      if (res.ok) {
        await fetchTeam();
        showToast('success', t('success.week_reverted'));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.save_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetTeam] revertWeek failed:', e);
      return false;
    }
  }

  async function revertMonth(userPublicId: string, year: number, month: number): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/revert/month`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userPublicId, year, month }),
        },
      );
      if (res.ok) {
        await fetchTeam();
        showToast('success', t('success.month_reverted'));
        return true;
      }
      showToast('danger', await resolveApiError(res, t('errors.save_failed')));
      return false;
    } catch (e) {
      console.error('[useTimesheetTeam] revertMonth failed:', e);
      return false;
    }
  }

  return {
    data,
    loading,
    filter,
    setFilter,
    refresh: fetchTeam,
    approveDay,
    approveWeek,
    approveMonth,
    rejectDay,
    revertWeek,
    revertMonth,
  };
}
