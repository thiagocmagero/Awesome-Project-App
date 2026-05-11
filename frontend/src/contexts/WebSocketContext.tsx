import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

type WsEventHandler = (data: unknown) => void;

interface WebSocketContextValue {
  /** Subscreve um evento WS. Devolve função de cleanup que faz unsubscribe. */
  on: (event: string, handler: WsEventHandler) => () => void;
  connected: boolean;
}

const noop = () => () => {};

const WebSocketContext = createContext<WebSocketContextValue>({
  on: noop,
  connected: false,
});

/**
 * Provider Socket.io que mantém uma única conexão WebSocket por sessão
 * autenticada. Reconecta automaticamente em queda de rede e desliga quando o
 * user faz logout.
 *
 * Design genérico — outros features (Board, Gantt, Timesheet) subscrevem
 * eventos próprios via `useWebSocket().on('event-name', handler)` sem precisar
 * de criar Providers paralelos.
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef<Map<string, Set<WsEventHandler>>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      // Sessão terminou — fecha qualquer socket aberto.
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    // Conexão fala com /api/socket.io (proxy Vite encaminha para o backend).
    // O path tem que estar sob /api porque o cookie HttpOnly `access_token`
    // tem `Path=/api` — fora desse prefixo o browser não envia o cookie e o
    // handshake é rejeitado pelo gateway.
    // `withCredentials: true` é mandatório para WS cross-origin via proxy.
    const socket = io('/notifications', {
      path: '/api/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Fan-out central — qualquer evento que o servidor emita é distribuído
    // pelos handlers registados via `on(event, handler)`.
    socket.onAny((event: string, data: unknown) => {
      const handlers = handlersRef.current.get(event);
      if (!handlers || handlers.size === 0) return;
      handlers.forEach((fn) => {
        try { fn(data); } catch { /* handler bug não deve derrubar o socket */ }
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?.publicId]);

  const on = useCallback((event: string, handler: WsEventHandler) => {
    let set = handlersRef.current.get(event);
    if (!set) {
      set = new Set();
      handlersRef.current.set(event, set);
    }
    set.add(handler);
    return () => {
      const current = handlersRef.current.get(event);
      current?.delete(handler);
      if (current && current.size === 0) handlersRef.current.delete(event);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ on, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = (): WebSocketContextValue => useContext(WebSocketContext);
