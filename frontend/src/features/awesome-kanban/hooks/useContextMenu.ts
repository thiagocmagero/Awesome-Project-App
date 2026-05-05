import { useCallback, useState } from 'react';

export interface ContextMenuTarget<T = unknown> {
  kind: 'card' | 'column' | 'row';
  data: T;
  anchor: { x: number; y: number };
}

export interface UseContextMenuResult<T = unknown> {
  active: ContextMenuTarget<T> | null;
  open: (target: ContextMenuTarget<T>) => void;
  close: () => void;
}

/**
 * Tracks the currently-open context menu (if any). Floating UI integration,
 * submenu logic and keyboard navigation arrive in Phase 4.
 */
export function useContextMenu<T = unknown>(): UseContextMenuResult<T> {
  const [active, setActive] = useState<ContextMenuTarget<T> | null>(null);

  const open = useCallback((target: ContextMenuTarget<T>) => {
    setActive(target);
  }, []);

  const close = useCallback(() => setActive(null), []);

  return { active, open, close };
}
