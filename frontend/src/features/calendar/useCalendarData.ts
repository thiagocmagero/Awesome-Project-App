// Hook: fetch calendar bundle + event/event-type mutations.
// Mirrors useBoardData.ts conventions.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiBase, apiFetch } from '../../lib/api';
import { EMPTY_CALENDAR_BUNDLE, type ICalendarBundle, type ICalendarMember } from './types';

export function useCalendarData(projectPublicId: string | undefined) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t: tcal } = useTranslation('calendar');
  const { t: tc }   = useTranslation('common');

  async function resolveApiError(res: Response, fallback: string): Promise<string> {
    const body: { error_code?: string; message?: string | string[] } = await res
      .json()
      .catch(() => ({}));
    if (typeof body.error_code === 'string' && body.error_code) {
      return tc(`errors.${body.error_code.toLowerCase()}` as Parameters<typeof tc>[0]);
    }
    if (Array.isArray(body.message)) return body.message.join(' · ');
    if (typeof body.message === 'string') return body.message;
    return fallback;
  }

  const [data, setData]       = useState<ICalendarBundle>(EMPTY_CALENDAR_BUNDLE);
  const [members, setMembers] = useState<ICalendarMember[]>([]);
  const [loading, setLoading] = useState(!!projectPublicId);
  const [error, setError]     = useState<string | null>(null);
  const firstLoad = useRef(true);

  const fetchCalendar = useCallback(async () => {
    if (!token || !projectPublicId) return;
    if (firstLoad.current) setLoading(true);
    setError(null);
    try {
      const api = getApiBase();
      const res = await apiFetch(
        `${api}/projects/${encodeURIComponent(projectPublicId)}/calendar`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        if (res.status !== 403) {
          showToast('danger', tcal('errors.load_failed'));
        }
        return;
      }
      const json = (await res.json()) as ICalendarBundle;
      setData(json);
    } catch (e) {
      console.error('[useCalendarData] fetchCalendar failed:', e);
      setError(String(e));
      showToast('danger', tcal('errors.load_failed'));
    } finally {
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectPublicId]);

  // Members fetched once per project (used by the modal)
  const fetchMembers = useCallback(async () => {
    if (!token || !projectPublicId) return;
    try {
      const api = getApiBase();
      const res = await apiFetch(
        `${api}/projects/${encodeURIComponent(projectPublicId)}/calendar/members`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) setMembers((await res.json()) as ICalendarMember[]);
    } catch (e) {
      console.error('[useCalendarData] fetchMembers failed:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectPublicId]);

  useEffect(() => {
    fetchCalendar();
    fetchMembers();
  }, [fetchCalendar, fetchMembers]);

  // ── Events CRUD ──────────────────────────────────────────────────────────

  async function createEvent(payload: {
    typeId: string;
    title: string;
    description?: string | null;
    startAt: string;
    endAt: string;
    allDay?: boolean;
    color?: string | null;
  }): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    const api = getApiBase();
    try {
      const res = await apiFetch(
        `${api}/projects/${encodeURIComponent(projectPublicId)}/calendar/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) { await fetchCalendar(); return true; }
      showToast('danger', await resolveApiError(res, tcal('errors.save_failed')));
      return false;
    } catch (err) {
      console.error('[useCalendarData] createEvent failed:', err);
      showToast('danger', tcal('errors.save_failed'));
      return false;
    }
  }

  async function updateEvent(eventPublicId: string, patch: {
    typeId?: string;
    title?: string;
    description?: string | null;
    startAt?: string;
    endAt?: string;
    allDay?: boolean;
    color?: string | null;
  }): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    const api = getApiBase();
    try {
      const res = await apiFetch(
        `${api}/projects/${encodeURIComponent(projectPublicId)}/calendar/events/${encodeURIComponent(eventPublicId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(patch),
        },
      );
      if (res.ok) { await fetchCalendar(); return true; }
      showToast('danger', await resolveApiError(res, tcal('errors.save_failed')));
      await fetchCalendar(); // revert visual
      return false;
    } catch (err) {
      console.error('[useCalendarData] updateEvent failed:', err);
      showToast('danger', tcal('errors.save_failed'));
      await fetchCalendar();
      return false;
    }
  }

  async function deleteEvent(eventPublicId: string): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    const api = getApiBase();
    try {
      const res = await apiFetch(
        `${api}/projects/${encodeURIComponent(projectPublicId)}/calendar/events/${encodeURIComponent(eventPublicId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) { await fetchCalendar(); return true; }
      showToast('danger', await resolveApiError(res, tcal('errors.delete_failed')));
      return false;
    } catch (err) {
      console.error('[useCalendarData] deleteEvent failed:', err);
      showToast('danger', tcal('errors.delete_failed'));
      return false;
    }
  }

  // ── Event types CRUD ─────────────────────────────────────────────────────

  async function createEventType(name: string, color?: string): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    const api = getApiBase();
    try {
      const res = await apiFetch(
        `${api}/projects/${encodeURIComponent(projectPublicId)}/calendar/event-types`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, ...(color ? { color } : {}) }),
        },
      );
      if (res.ok) { await fetchCalendar(); return true; }
      showToast('danger', await resolveApiError(res, tcal('errors.save_failed')));
      return false;
    } catch (err) {
      console.error('[useCalendarData] createEventType failed:', err);
      showToast('danger', tcal('errors.save_failed'));
      return false;
    }
  }

  async function updateEventType(typePublicId: string, patch: { name?: string | null; color?: string }): Promise<boolean> {
    if (!token || !projectPublicId) return false;
    const api = getApiBase();
    try {
      const res = await apiFetch(
        `${api}/projects/${encodeURIComponent(projectPublicId)}/calendar/event-types/${encodeURIComponent(typePublicId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(patch),
        },
      );
      if (res.ok) { await fetchCalendar(); return true; }
      showToast('danger', await resolveApiError(res, tcal('errors.save_failed')));
      return false;
    } catch (err) {
      console.error('[useCalendarData] updateEventType failed:', err);
      showToast('danger', tcal('errors.save_failed'));
      return false;
    }
  }

  async function deleteEventType(typePublicId: string): Promise<{ ok: boolean; error?: string }> {
    if (!token || !projectPublicId) return { ok: false };
    const api = getApiBase();
    try {
      const res = await apiFetch(
        `${api}/projects/${encodeURIComponent(projectPublicId)}/calendar/event-types/${encodeURIComponent(typePublicId)}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) { await fetchCalendar(); return { ok: true }; }
      const errMsg = await resolveApiError(res, tcal('errors.delete_failed'));
      showToast('danger', errMsg);
      return { ok: false, error: errMsg };
    } catch (err) {
      console.error('[useCalendarData] deleteEventType failed:', err);
      showToast('danger', tcal('errors.delete_failed'));
      return { ok: false, error: String(err) };
    }
  }

  return {
    data,
    members,
    loading,
    error,
    refreshCalendar: fetchCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    createEventType,
    updateEventType,
    deleteEventType,
  };
}
