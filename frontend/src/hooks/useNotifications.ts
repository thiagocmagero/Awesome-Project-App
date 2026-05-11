import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { getApiBase, apiFetch } from '../lib/api';
import type { AppNotification } from '../features/notifications/types';

export type { AppNotification };

/** Polling de fallback quando o WS está caído. Antes era 30s; com WS activo,
 *  5min é suficiente para apanhar drift e notificações criadas off-line. */
const POLL_FALLBACK_INTERVAL_MS = 5 * 60 * 1000;

export function useNotifications() {
  const { token } = useAuth();
  const { on: subscribeWs } = useWebSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingToasts, setPendingToasts] = useState<AppNotification[]>([]);
  const api = getApiBase();
  // Set dos publicIds já vistos — evita duplicar toast se a notificação chegar
  // via WS e logo a seguir num refetch (polling de fallback).
  const seenPublicIdsRef = useRef<Set<string>>(new Set());

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
      // Re-build seen set baseado no fetch (representa estado canónico)
      data.items.forEach((n) => seenPublicIdsRef.current.add(n.publicId));
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

  // Fetch inicial + polling de fallback (5 min)
  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, POLL_FALLBACK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  // Subscrição WebSocket — push imediato
  useEffect(() => {
    return subscribeWs('notification:new', (raw) => {
      const notif = raw as AppNotification;
      if (!notif?.publicId) return;
      // Defesa contra duplicação WS + refetch concorrente
      if (seenPublicIdsRef.current.has(notif.publicId)) return;
      seenPublicIdsRef.current.add(notif.publicId);

      setNotifications((prev) => [notif, ...prev]);
      if (!notif.read) setUnreadCount((c) => c + 1);
      setPendingToasts((prev) => [...prev, notif]);
      // Lifecycle do toast (entrada/visível/saída/remoção) é gerido por
      // ToastItem no NotificationToastStack — esse componente chama
      // `onDismiss` (dismissToast) no final do fade-out.
    });
  }, [subscribeWs]);

  const dismissToast = useCallback((publicId: string) => {
    setPendingToasts((prev) => prev.filter((t) => t.publicId !== publicId));
  }, []);

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

  return {
    notifications,
    unreadCount,
    nextCursor,
    loadMore,
    markAsRead,
    markAllAsRead,
    refetch,
    pendingToasts,
    dismissToast,
  };
}
