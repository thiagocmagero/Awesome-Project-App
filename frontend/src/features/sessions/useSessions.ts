import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getApiBase } from '../../lib/api';

export interface SessionDevice {
  browser?: string;
  os?: string;
  type?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

export interface SessionLocation {
  country?: string;
  city?: string;
}

export interface ActiveSession {
  publicId: string;
  isCurrent: boolean;
  device: SessionDevice;
  location: SessionLocation | null;
  ip: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export function useSessions() {
  const api = getApiBase();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${api}/auth/sessions`);
      if (!res.ok) {
        setError(String(res.status));
        setSessions([]);
        return;
      }
      const data = (await res.json()) as ActiveSession[];
      setSessions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const revokeSession = useCallback(
    async (publicId: string): Promise<boolean> => {
      const res = await apiFetch(`${api}/auth/sessions/${publicId}/revoke`, {
        method: 'POST',
      });
      if (!res.ok) return false;
      await fetchSessions();
      return true;
    },
    [api, fetchSessions],
  );

  const revokeOthers = useCallback(async (): Promise<number> => {
    const res = await apiFetch(`${api}/auth/sessions/revoke-others`, {
      method: 'POST',
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { revokedCount?: number };
    await fetchSessions();
    return data.revokedCount ?? 0;
  }, [api, fetchSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, fetchSessions, revokeSession, revokeOthers };
}
