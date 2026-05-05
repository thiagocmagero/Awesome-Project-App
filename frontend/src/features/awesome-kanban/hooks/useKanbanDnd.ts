import { useCallback, useMemo, useState } from 'react';
import type {
  DragStart,
  DragUpdate,
  DropResult,
} from '@hello-pangea/dnd';
import type { Card, Column, Id, Row } from '../types';

export interface DropValidation {
  ok: boolean;
  reason?: 'strict-limit' | 'allow-from' | 'allow-to' | 'overlay';
}

export interface UseKanbanDndOptions {
  cards: Card[];
  columns: Column[];
  rows: Row[];
  selection: Id[];
  rowKey: string;
  enabled?: boolean;
  /** Called for each ongoing drop hover so we can mark a target as invalid. */
  onValidate?: (
    card: Card,
    toColumn: Column,
    toRowId: Id | null
  ) => DropValidation;
}

export interface DragTarget {
  columnId: Id;
  rowId: Id | null;
  /** Card id we're inserting before, if any. */
  beforeId?: Id;
  /** Card id we're inserting after — used when dropping at the tail. */
  afterId?: Id;
  /** Whether the most recent over event was deemed valid. */
  valid: boolean;
}

export interface UseKanbanDndResult {
  /** Currently-dragging card (if any). */
  active: Card | null;
  /** All ids being dragged (multi-select). */
  draggingIds: Id[];
  /** Latest drop target evaluated by onDragUpdate (used for visual feedback). */
  target: DragTarget | null;
  /** True while the target is rejected (red highlight). */
  invalid: boolean;
  handleDragStart: (start: DragStart) => void;
  handleDragUpdate: (update: DragUpdate) => void;
  handleDragEnd: (result: DropResult) => DragResolved | null;
  cancel: () => void;
}

export type DragResolved =
  | {
      kind: 'card';
      ids: Id[];
      fromColumnId: Id;
      fromRowId: Id | null;
      toColumnId: Id;
      toRowId: Id | null;
      beforeId?: Id;
      afterId?: Id;
    }
  | {
      kind: 'column';
      columnId: Id;
      targetColumnId: Id;
      placement: 'before' | 'after';
    }
  | {
      kind: 'row';
      rowId: Id;
      targetRowId: Id;
      placement: 'before' | 'after';
    };

const ALWAYS_VALID: DropValidation = { ok: true };

/**
 * Droppable id format for cards: "cell::<columnId>::<rowId|_>"  (swimlane mode)
 *                                "column::<columnId>::_"        (flat mode)
 * Returns columnId/rowId as strings; callers reconcile with the original
 * `Id` (which can be string|number) by lookup against `columns`/`cards`.
 */
function parseCardDroppableId(
  id: string
): { columnId: string; rowId: string | null } | null {
  const parts = id.split('::');
  if (parts.length !== 3) return null;
  if (parts[0] !== 'cell' && parts[0] !== 'column') return null;
  const columnId = parts[1] ?? '';
  const rowSeg = parts[2] ?? '_';
  return { columnId, rowId: rowSeg === '_' ? null : rowSeg };
}

/** Reconcile a string id segment with the typed `Id` actually present in the
 *  source list (handles number ids that get serialised as strings into
 *  draggableId/droppableId). */
function findIdMatch<T extends { id: Id }>(
  list: T[],
  segment: string
): T | undefined {
  return list.find((x) => String(x.id) === segment);
}

export function useKanbanDnd(options: UseKanbanDndOptions): UseKanbanDndResult {
  const {
    cards,
    columns,
    rows,
    selection,
    rowKey,
    enabled = true,
    onValidate,
  } = options;

  const [active, setActive] = useState<Card | null>(null);
  const [draggingIds, setDraggingIds] = useState<Id[]>([]);
  const [target, setTarget] = useState<DragTarget | null>(null);
  const [invalid, setInvalid] = useState(false);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) m.set(String(c.id), c);
    return m;
  }, [cards]);

  const columnById = useMemo(() => {
    const m = new Map<string, Column>();
    for (const c of columns) m.set(String(c.id), c);
    return m;
  }, [columns]);

  const rowByStringId = useMemo(() => {
    const m = new Map<string, Row>();
    for (const r of rows) m.set(String(r.id), r);
    return m;
  }, [rows]);

  const cancel = useCallback(() => {
    setActive(null);
    setDraggingIds([]);
    setTarget(null);
    setInvalid(false);
  }, []);

  const handleDragStart = useCallback(
    (start: DragStart) => {
      if (!enabled) return;
      // Column / row drags don't populate `active` — they use the lib's own
      // transform-based movement, no overlay ghost.
      if (start.type === 'COLUMN' || start.type === 'ROW') {
        setActive(null);
        setDraggingIds([]);
        setTarget(null);
        setInvalid(false);
        return;
      }
      // Card drag.
      const card = cardById.get(start.draggableId);
      if (!card) return;
      // Multi-select: if the dragged card is part of the selection, drag the
      // whole group; otherwise drag just this card.
      const ids = selection.includes(card.id) ? selection : [card.id];
      setActive(card);
      setDraggingIds(ids);
      setTarget(null);
      setInvalid(false);
    },
    [enabled, cardById, selection]
  );

  /**
   * Translate hello-pangea's `destination.index` into the (beforeId | afterId)
   * pair that `applyCardMove` expects. The library reports `index` based on
   * the FINAL list (after the move), so we compute the destination cell minus
   * the cards being moved, then look up the sibling at that position.
   */
  const computeBeforeAfter = useCallback(
    (
      toColumnId: Id,
      toRowId: Id | null,
      destinationIndex: number,
      ids: Id[]
    ): { beforeId?: Id; afterId?: Id } => {
      const movingSet = new Set(ids);
      const destCellCards = cards.filter(
        (c) =>
          c.columnId === toColumnId &&
          ((c as Record<string, unknown>)[rowKey] ?? null) ===
            (toRowId ?? null) &&
          !movingSet.has(c.id)
      );
      if (destinationIndex < destCellCards.length) {
        return { beforeId: destCellCards[destinationIndex]!.id };
      }
      const tail = destCellCards[destCellCards.length - 1];
      return tail ? { afterId: tail.id } : {};
    },
    [cards, rowKey]
  );

  const validateTarget = useCallback(
    (card: Card, t: DragTarget, ids: Id[]): boolean => {
      const col = columnById.get(String(t.columnId));
      if (!col) return false;
      if (col.overlay) return false;
      if (col.allowDropFrom && !col.allowDropFrom.includes(card.columnId))
        return false;
      const sourceCol = columnById.get(String(card.columnId));
      if (sourceCol?.allowDropTo && !sourceCol.allowDropTo.includes(t.columnId))
        return false;

      // strictLimit
      if (col.strictLimit) {
        const cellOrColumnLimit =
          typeof col.limit === 'number'
            ? col.limit
            : col.limit && t.rowId !== null
              ? col.limit[t.rowId]
              : undefined;
        if (cellOrColumnLimit !== undefined) {
          const movingSet = new Set(ids);
          const present = cards.filter(
            (c) =>
              c.columnId === t.columnId &&
              ((c as Record<string, unknown>)[rowKey] ?? null) ===
                (t.rowId ?? null) &&
              !movingSet.has(c.id)
          );
          if (present.length + ids.length > cellOrColumnLimit) {
            return false;
          }
        }
      }

      // External validator
      if (onValidate) {
        const v = onValidate(card, col, t.rowId) ?? ALWAYS_VALID;
        if (!v.ok) return false;
      }
      return true;
    },
    [columnById, cards, rowKey, onValidate]
  );

  const handleDragUpdate = useCallback(
    (update: DragUpdate) => {
      if (!enabled || !active) return;
      if (update.type !== 'CARD') return;
      const dest = update.destination;
      if (!dest) {
        setTarget(null);
        setInvalid(false);
        return;
      }
      const parsed = parseCardDroppableId(dest.droppableId);
      if (!parsed) {
        setTarget(null);
        setInvalid(false);
        return;
      }
      const col = columnById.get(parsed.columnId);
      if (!col) {
        setTarget(null);
        setInvalid(false);
        return;
      }
      const toRow =
        parsed.rowId !== null ? rowByStringId.get(parsed.rowId) : undefined;
      const toRowId: Id | null =
        parsed.rowId !== null ? (toRow?.id ?? parsed.rowId) : null;

      const { beforeId, afterId } = computeBeforeAfter(
        col.id,
        toRowId,
        dest.index,
        draggingIds
      );

      const t: DragTarget = {
        columnId: col.id,
        rowId: toRowId,
        ...(beforeId !== undefined ? { beforeId } : {}),
        ...(afterId !== undefined ? { afterId } : {}),
        valid: true,
      };
      const ok = validateTarget(active, t, draggingIds);
      setTarget({ ...t, valid: ok });
      setInvalid(!ok);
    },
    [
      enabled,
      active,
      columnById,
      rowByStringId,
      computeBeforeAfter,
      draggingIds,
      validateTarget,
    ]
  );

  const handleDragEnd = useCallback(
    (result: DropResult): DragResolved | null => {
      if (!enabled) {
        cancel();
        return null;
      }

      // Column reorder
      if (result.type === 'COLUMN') {
        cancel();
        if (!result.destination) return null;
        if (result.destination.index === result.source.index) return null;
        const sourceColId = result.draggableId.startsWith('col-')
          ? result.draggableId.slice(4)
          : result.draggableId;
        const fromCol = findIdMatch(columns, sourceColId);
        if (!fromCol) return null;
        const targetCol = columns[result.destination.index];
        if (!targetCol || targetCol.id === fromCol.id) return null;
        return {
          kind: 'column',
          columnId: fromCol.id,
          targetColumnId: targetCol.id,
          placement:
            result.destination.index > result.source.index ? 'after' : 'before',
        };
      }

      // Row reorder
      if (result.type === 'ROW') {
        cancel();
        if (!result.destination) return null;
        if (result.destination.index === result.source.index) return null;
        const sourceRowId = result.draggableId.startsWith('row-')
          ? result.draggableId.slice(4)
          : result.draggableId;
        const fromRow = findIdMatch(rows, sourceRowId);
        if (!fromRow) return null;
        const targetRow = rows[result.destination.index];
        if (!targetRow || targetRow.id === fromRow.id) return null;
        return {
          kind: 'row',
          rowId: fromRow.id,
          targetRowId: targetRow.id,
          placement:
            result.destination.index > result.source.index ? 'after' : 'before',
        };
      }

      // Card move
      if (!active) {
        cancel();
        return null;
      }
      const dest = result.destination;
      if (!dest) {
        cancel();
        return null;
      }
      const parsed = parseCardDroppableId(dest.droppableId);
      if (!parsed) {
        cancel();
        return null;
      }
      const col = columnById.get(parsed.columnId);
      if (!col) {
        cancel();
        return null;
      }
      const toRow =
        parsed.rowId !== null ? rowByStringId.get(parsed.rowId) : undefined;
      const toRowId: Id | null =
        parsed.rowId !== null ? (toRow?.id ?? parsed.rowId) : null;

      const { beforeId, afterId } = computeBeforeAfter(
        col.id,
        toRowId,
        dest.index,
        draggingIds
      );

      const t: DragTarget = {
        columnId: col.id,
        rowId: toRowId,
        ...(beforeId !== undefined ? { beforeId } : {}),
        ...(afterId !== undefined ? { afterId } : {}),
        valid: true,
      };
      const ok = validateTarget(active, t, draggingIds);
      const resolvedActive = active;
      const resolvedIds = draggingIds;
      cancel();
      if (!ok) return null;

      // No-op detection: same cell + before/after points at the active card
      // itself (would imply the user dropped on the leader's own slot).
      if (
        resolvedActive.columnId === t.columnId &&
        ((resolvedActive as Record<string, unknown>)[rowKey] ?? null) ===
          (t.rowId ?? null) &&
        ((t.beforeId !== undefined && t.beforeId === resolvedActive.id) ||
          (t.afterId !== undefined && t.afterId === resolvedActive.id))
      ) {
        return null;
      }

      return {
        kind: 'card',
        ids: resolvedIds,
        fromColumnId: resolvedActive.columnId,
        fromRowId:
          ((resolvedActive as Record<string, unknown>)[rowKey] as Id) ?? null,
        toColumnId: t.columnId,
        toRowId: t.rowId,
        ...(t.beforeId !== undefined ? { beforeId: t.beforeId } : {}),
        ...(t.afterId !== undefined ? { afterId: t.afterId } : {}),
      };
    },
    [
      enabled,
      active,
      cancel,
      columns,
      rows,
      columnById,
      rowByStringId,
      computeBeforeAfter,
      draggingIds,
      rowKey,
      validateTarget,
    ]
  );

  return {
    active,
    draggingIds,
    target,
    invalid,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    cancel,
  };
}
