import type {
  Card,
  CardMoveEvent,
  Column,
  ColumnMoveEvent,
  Id,
  Row,
  RowMoveEvent,
} from '../types';

let counter = 0;

/** Generate a unique id with optional prefix. Stable within a session. */
export function generateId(prefix = 'ak'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/**
 * Insert `item` into `list` relative to a sibling or at boundaries.
 * If both `before` and `after` are provided, `before` wins.
 */
export function insertAt<T extends { id: Id }>(
  list: T[],
  item: T,
  options: { before?: Id; after?: Id } = {}
): T[] {
  const next = [...list];
  if (options.before !== undefined) {
    const idx = next.findIndex((x) => x.id === options.before);
    if (idx >= 0) {
      next.splice(idx, 0, item);
      return next;
    }
  }
  if (options.after !== undefined) {
    const idx = next.findIndex((x) => x.id === options.after);
    if (idx >= 0) {
      next.splice(idx + 1, 0, item);
      return next;
    }
  }
  next.push(item);
  return next;
}

/** Move an item with id `id` to a new position relative to a sibling. */
export function moveById<T extends { id: Id }>(
  list: T[],
  id: Id,
  target: { before?: Id; after?: Id }
): T[] {
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return list;
  const item = list[idx]!;
  const without = list.filter((_, i) => i !== idx);
  return insertAt(without, item, target);
}

/** Remove items by id (single or array). */
export function removeById<T extends { id: Id }>(list: T[], id: Id | Id[]): T[] {
  const set = new Set(Array.isArray(id) ? id : [id]);
  return list.filter((x) => !set.has(x.id));
}

/** Update first item matching id with a partial patch. */
export function updateById<T extends { id: Id }>(
  list: T[],
  id: Id,
  patch: Partial<T>
): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducers — apply a *Move event to the corresponding state slice.
// Use these from controlled-mode `onCardMove` / `onColumnMove` / `onRowMove`
// handlers so the consumer doesn't have to reimplement the move/insertion
// logic that the API performs internally.
// ─────────────────────────────────────────────────────────────────────────────

/** Apply a CardMoveEvent to a `cards` array, updating columnId / rowId of
 *  the moving cards and re-positioning them at `before` / `after`. */
export function applyCardMove(
  cards: Card[],
  event: CardMoveEvent,
  rowKey: string = 'rowId'
): Card[] {
  const movingIds = new Set(event.source);
  const moving = cards.filter((c) => movingIds.has(c.id));
  const remaining = cards.filter((c) => !movingIds.has(c.id));
  if (moving.length === 0) return cards;

  const updated = moving.map((c) => ({
    ...c,
    columnId: event.toColumnId,
    [rowKey]: event.toRowId ?? undefined,
  }));

  if (event.before !== undefined) {
    const idx = remaining.findIndex((c) => c.id === event.before);
    return idx >= 0
      ? [...remaining.slice(0, idx), ...updated, ...remaining.slice(idx)]
      : [...remaining, ...updated];
  }
  if (event.after !== undefined) {
    const idx = remaining.findIndex((c) => c.id === event.after);
    return idx >= 0
      ? [
          ...remaining.slice(0, idx + 1),
          ...updated,
          ...remaining.slice(idx + 1),
        ]
      : [...remaining, ...updated];
  }
  return [...remaining, ...updated];
}

/** Apply a ColumnMoveEvent to a `columns` array. */
export function applyColumnReorder(
  columns: Column[],
  event: ColumnMoveEvent
): Column[] {
  return moveById(columns, event.id, {
    before: event.before,
    after: event.after,
  });
}

/** Apply a RowMoveEvent to a `rows` array. */
export function applyRowReorder(rows: Row[], event: RowMoveEvent): Row[] {
  return moveById(rows, event.id, {
    before: event.before,
    after: event.after,
  });
}
