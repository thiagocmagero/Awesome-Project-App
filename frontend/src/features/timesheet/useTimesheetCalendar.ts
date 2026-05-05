/**
 * useTimesheetCalendar — fetch da vista mensal agregada/individual.
 * Endpoint: GET /api/projects/:id/timesheets/calendar?month=YYYY-MM[&userId=PUBLICID]
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiBase, apiFetch } from '../../lib/api';
import type { ITimesheetMonthBundle } from './types';

const EMPTY_BUNDLE: ITimesheetMonthBundle = {
  project: { publicId: '', startDate: null, endDate: null },
  month: '',
  visibleStart: '',
  mode: 'aggregate',
  members: [],
  days: [],
  weeks: [],
  totalHours: 0,
};

export function useTimesheetCalendar(
  projectPublicId: string | undefined,
  monthIso: string | null,                       // 'YYYY-MM' — null = inactivo
  individualUserPublicId: string | null,         // null = modo agregado
  enabled: boolean,
) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('timesheet');

  const [data, setData]       = useState<ITimesheetMonthBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchMonth = useCallback(async () => {
    if (!enabled || !token || !projectPublicId || !monthIso) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL(
        `${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/calendar`,
        window.location.origin,
      );
      url.searchParams.set('month', monthIso);
      if (individualUserPublicId) url.searchParams.set('userId', individualUserPublicId);
      const res = await apiFetch(url.pathname + url.search, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData((await res.json()) as ITimesheetMonthBundle);
      } else if (res.status !== 403) {
        setError(`HTTP ${res.status}`);
        showToast('danger', t('errors.load_failed'));
      }
    } catch (e) {
      console.error('[useTimesheetCalendar] failed:', e);
      setError(String(e));
      showToast('danger', t('errors.load_failed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, token, projectPublicId, monthIso, individualUserPublicId]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  return { data, loading, error, refresh: fetchMonth };
}
