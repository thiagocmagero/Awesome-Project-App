import type { AwesomeKanbanEventMap } from '../types';

type EventName = keyof AwesomeKanbanEventMap;
type Handler<K extends EventName> = (
  e: AwesomeKanbanEventMap[K]
) => void | boolean;

export interface EventBus {
  on<K extends EventName>(event: K, handler: Handler<K>): () => void;
  off<K extends EventName>(event: K, handler: Handler<K>): void;
  emit<K extends EventName>(event: K, payload: AwesomeKanbanEventMap[K]): void;
  intercept<K extends EventName>(
    event: K,
    handler: (e: AwesomeKanbanEventMap[K]) => boolean
  ): () => void;
  /** Emit an event and return false if any interceptor or handler returns false. */
  emitCancellable<K extends EventName>(
    event: K,
    payload: AwesomeKanbanEventMap[K]
  ): boolean;
  clear(): void;
}

export function createEventBus(): EventBus {
  const handlers = new Map<EventName, Set<Handler<EventName>>>();
  const interceptors = new Map<
    EventName,
    Set<(e: unknown) => boolean>
  >();

  function getHandlers<K extends EventName>(event: K): Set<Handler<K>> {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    return set as Set<Handler<K>>;
  }

  function getInterceptors<K extends EventName>(
    event: K
  ): Set<(e: AwesomeKanbanEventMap[K]) => boolean> {
    let set = interceptors.get(event);
    if (!set) {
      set = new Set();
      interceptors.set(event, set);
    }
    return set as Set<(e: AwesomeKanbanEventMap[K]) => boolean>;
  }

  return {
    on(event, handler) {
      const set = getHandlers(event);
      set.add(handler);
      return () => set.delete(handler);
    },
    off(event, handler) {
      handlers.get(event)?.delete(handler as Handler<EventName>);
    },
    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      for (const handler of set) {
        try {
          (handler as Handler<typeof event>)(payload);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[awesome-kanban] event handler error', event, err);
        }
      }
    },
    intercept(event, handler) {
      const set = getInterceptors(event);
      set.add(handler as (e: unknown) => boolean);
      return () => set.delete(handler as (e: unknown) => boolean);
    },
    emitCancellable(event, payload) {
      const intercepts = interceptors.get(event);
      if (intercepts) {
        for (const interceptor of intercepts) {
          if (interceptor(payload) === false) return false;
        }
      }
      const set = handlers.get(event);
      if (set) {
        for (const handler of set) {
          const result = (handler as Handler<typeof event>)(payload);
          if (result === false) return false;
        }
      }
      return true;
    },
    clear() {
      handlers.clear();
      interceptors.clear();
    },
  };
}
