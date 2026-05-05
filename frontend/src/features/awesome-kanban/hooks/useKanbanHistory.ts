import { useCallback, useRef, useState } from 'react';
import type { Card, Column, Link, Row } from '../types';

export interface HistorySnapshot {
  columns: Column[];
  rows: Row[];
  cards: Card[];
  links: Link[];
}

export interface UseKanbanHistoryOptions {
  enabled: boolean;
  undoLimit?: number;
  getSnapshot: () => HistorySnapshot;
  applySnapshot: (snap: HistorySnapshot) => void;
}

export interface UseKanbanHistoryResult {
  /** Capture the *current* state into the undo stack. Call before any
   *  mutating API method. Clears the redo stack. */
  push: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const DEFAULT_LIMIT = 50;

/**
 * Snapshot-based undo/redo. Each `push()` clones the current `{columns,
 * rows, cards, links}` slice and stores it. `undo()` swaps the latest
 * snapshot with the current state; `redo()` reverses that. Selection is
 * intentionally NOT snapshotted — it's ephemeral.
 *
 * Snapshots are shallow-copied at the array level, but the entity objects
 * themselves are shared with the live state. Since the API never mutates an
 * entity in place (it always replaces it with a new object via spread), this
 * is safe.
 */
export function useKanbanHistory({
  enabled,
  undoLimit = DEFAULT_LIMIT,
  getSnapshot,
  applySnapshot,
}: UseKanbanHistoryOptions): UseKanbanHistoryResult {
  const undoStack = useRef<HistorySnapshot[]>([]);
  const redoStack = useRef<HistorySnapshot[]>([]);
  // We track the lengths in state so the toolbar buttons re-render
  // when canUndo/canRedo flips.
  const [, forceRefresh] = useState(0);

  const refresh = useCallback(() => forceRefresh((n) => n + 1), []);

  const push = useCallback(() => {
    if (!enabled) return;
    const snap = getSnapshot();
    // Defensive shallow copy of arrays (entity objects unchanged).
    undoStack.current.push({
      columns: [...snap.columns],
      rows: [...snap.rows],
      cards: [...snap.cards],
      links: [...snap.links],
    });
    if (undoStack.current.length > undoLimit) {
      undoStack.current.shift();
    }
    redoStack.current.length = 0;
    refresh();
  }, [enabled, undoLimit, getSnapshot, refresh]);

  const undo = useCallback(() => {
    if (!enabled || undoStack.current.length === 0) return;
    const current = getSnapshot();
    redoStack.current.push({
      columns: [...current.columns],
      rows: [...current.rows],
      cards: [...current.cards],
      links: [...current.links],
    });
    const snap = undoStack.current.pop()!;
    applySnapshot(snap);
    refresh();
  }, [enabled, getSnapshot, applySnapshot, refresh]);

  const redo = useCallback(() => {
    if (!enabled || redoStack.current.length === 0) return;
    const current = getSnapshot();
    undoStack.current.push({
      columns: [...current.columns],
      rows: [...current.rows],
      cards: [...current.cards],
      links: [...current.links],
    });
    const snap = redoStack.current.pop()!;
    applySnapshot(snap);
    refresh();
  }, [enabled, getSnapshot, applySnapshot, refresh]);

  const canUndo = useCallback(() => undoStack.current.length > 0, []);
  const canRedo = useCallback(() => redoStack.current.length > 0, []);

  const clear = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    refresh();
  }, [refresh]);

  return { push, undo, redo, canUndo, canRedo, clear };
}
