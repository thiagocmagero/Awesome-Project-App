import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspaces } from '../contexts/WorkspacesContext';

export type CalendarStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface WorkspaceCalendar {
  publicId: string;
  name: string;
  description: string | null;
  status: CalendarStatus;
  datesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDate {
  publicId: string;
  name: string;
  /** UTC midnight ISO 8601 (data pura — sem hora). */
  date: string;
  status: CalendarStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDetail extends WorkspaceCalendar {
  dates: CalendarDate[];
}

/** Shape devolvida pelo backend (`HolidaysService.serializeHoliday`). */
interface ApiCalendarListItem {
  publicId: string;
  name: string;
  description: string | null;
  status: CalendarStatus;
  _count: { dates: number };
  createdAt: string;
  updatedAt: string;
}
interface ApiCalendarDetail extends Omit<ApiCalendarListItem, '_count'> {
  _count: { dates: number };
  dates: CalendarDate[];
}

function toListItem(raw: ApiCalendarListItem): WorkspaceCalendar {
  return {
    publicId: raw.publicId,
    name: raw.name,
    description: raw.description,
    status: raw.status,
    datesCount: raw._count?.dates ?? 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toDetail(raw: ApiCalendarDetail): CalendarDetail {
  return {
    ...toListItem(raw),
    dates: raw.dates ?? [],
  };
}

export interface CalendarCreatePayload {
  name: string;
  description?: string | null;
  status?: CalendarStatus;
}

export interface CalendarUpdatePayload {
  name?: string;
  description?: string | null;
  status?: CalendarStatus;
}

export interface DateCreatePayload {
  name: string;
  /** ISO 8601 — `YYYY-MM-DD` ou completo; backend normaliza para UTC midnight. */
  date: string;
}

export interface DateUpdatePayload {
  name?: string;
  date?: string;
  status?: CalendarStatus;
}

/**
 * Hook de dados para a página `/calendars` em frontend2.
 *
 * Lista os calendários (`Holiday`) do workspace activo e expõe CRUD completo
 * de calendários + datas. Backend resolve workspace via header `X-Workspace-Id`
 * (já injectado pelo `apiFetch` via `setActiveWorkspaceId`).
 *
 * Refaz fetch quando o `activeWorkspace` muda — a UI revela o switch de
 * workspace e os calendários do workspace anterior são substituídos.
 */
export function useWorkspaceCalendars() {
  const { user, loading: authLoading } = useAuth();
  const { activeWorkspace } = useWorkspaces();
  const activeWsId = activeWorkspace?.publicId ?? null;

  const [calendars, setCalendars] = useState<WorkspaceCalendar[]>([]);
  const [active, setActive] = useState<CalendarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setCalendars([]);
      setActive(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const list = await apiGet<ApiCalendarListItem[]>('/holidays');
      setCalendars(list.map(toListItem));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Re-fetch sempre que o user ou o workspace activo mudam. A dependência
  // explícita em `activeWsId` garante refresh ao trocar de workspace.
  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    setActive(null);
    refresh();
  }, [authLoading, refresh, activeWsId]);

  const select = useCallback(async (publicId: string | null) => {
    if (!publicId) {
      setActive(null);
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await apiGet<ApiCalendarDetail>(`/holidays/${publicId}`);
      setActive(toDetail(detail));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: CalendarCreatePayload): Promise<WorkspaceCalendar> => {
    const created = await apiPost<ApiCalendarListItem>('/holidays', payload);
    const item = toListItem(created);
    setCalendars((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
    return item;
  }, []);

  const update = useCallback(async (publicId: string, payload: CalendarUpdatePayload): Promise<CalendarDetail> => {
    const updated = await apiPatch<ApiCalendarDetail>(`/holidays/${publicId}`, payload);
    const detail = toDetail(updated);
    setCalendars((prev) =>
      prev
        .map((c) => (c.publicId === publicId ? { ...c, ...toListItem(updated) } : c))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setActive((curr) => (curr?.publicId === publicId ? detail : curr));
    return detail;
  }, []);

  const remove = useCallback(async (publicId: string): Promise<void> => {
    await apiDelete(`/holidays/${publicId}`);
    setCalendars((prev) => prev.filter((c) => c.publicId !== publicId));
    setActive((curr) => (curr?.publicId === publicId ? null : curr));
  }, []);

  const addDate = useCallback(async (publicId: string, payload: DateCreatePayload): Promise<CalendarDate> => {
    const created = await apiPost<CalendarDate>(`/holidays/${publicId}/dates`, payload);
    setActive((curr) => {
      if (!curr || curr.publicId !== publicId) return curr;
      const dates = [...curr.dates, created].sort((a, b) => a.date.localeCompare(b.date));
      return { ...curr, dates, datesCount: dates.length };
    });
    setCalendars((prev) =>
      prev.map((c) => (c.publicId === publicId ? { ...c, datesCount: c.datesCount + 1 } : c)),
    );
    return created;
  }, []);

  const updateDate = useCallback(
    async (publicId: string, datePublicId: string, payload: DateUpdatePayload): Promise<CalendarDate> => {
      const updated = await apiPatch<CalendarDate>(`/holidays/${publicId}/dates/${datePublicId}`, payload);
      setActive((curr) => {
        if (!curr || curr.publicId !== publicId) return curr;
        const dates = curr.dates
          .map((d) => (d.publicId === datePublicId ? updated : d))
          .sort((a, b) => a.date.localeCompare(b.date));
        return { ...curr, dates };
      });
      return updated;
    },
    [],
  );

  const removeDate = useCallback(async (publicId: string, datePublicId: string): Promise<void> => {
    await apiDelete(`/holidays/${publicId}/dates/${datePublicId}`);
    setActive((curr) => {
      if (!curr || curr.publicId !== publicId) return curr;
      const dates = curr.dates.filter((d) => d.publicId !== datePublicId);
      return { ...curr, dates, datesCount: dates.length };
    });
    setCalendars((prev) =>
      prev.map((c) => (c.publicId === publicId ? { ...c, datesCount: Math.max(0, c.datesCount - 1) } : c)),
    );
  }, []);

  return {
    calendars,
    active,
    loading,
    detailLoading,
    error,
    refresh,
    select,
    create,
    update,
    remove,
    addDate,
    updateDate,
    removeDate,
  };
}
