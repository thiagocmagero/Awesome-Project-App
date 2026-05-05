import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import type { AppNotification } from '../features/notifications/types';

export type { AppNotification };

export function useNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const api = getApiBase();

  const refetch = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch(`${api}/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: { items: AppNotification[]; nextCursor: string | null } = await res.json();
      setNotifications(data.items);
      setNextCursor(data.nextCursor);
      setUnreadCount(data.items.filter((n) => !n.read).length);
    } catch {
      // Silent — polling failure must not interrupt the user
    }
  }, [token, api]);

  const loadMore = useCallback(async () => {
    if (!token || !nextCursor) return;
    try {
      const res = await apiFetch(`${api}/notifications?limit=20&cursor=${encodeURIComponent(nextCursor)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: { items: AppNotification[]; nextCursor: string | null } = await res.json();
      setNotifications((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch {/* silent */}
  }, [token, api, nextCursor]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, 30_000);
    return () => clearInterval(interval);
  }, [refetch]);

  const markAsRead = useCallback(async (publicIds: string[]) => {
    if (!token || !publicIds.length) return;
    try {
      await apiFetch(`${api}/notifications/mark-read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicIds }),
      });
      setNotifications((prev) =>
        prev.map((n) => (publicIds.includes(n.publicId) ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - publicIds.length));
    } catch {/* silent */}
  }, [token, api]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await apiFetch(`${api}/notifications/mark-read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {/* silent */}
  }, [token, api]);

  return { notifications, unreadCount, nextCursor, loadMore, markAsRead, markAllAsRead, refetch };
}
