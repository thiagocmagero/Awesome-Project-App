/**
 * `AwesomeKanbanApi` factory.
 *
 * Phase 1 ships only the read/write primitives needed to make the static
 * board interactive (add / update / delete / select / serialize).
 * History, drag&drop, editor, search and event-bus interception arrive in
 * later phases — those methods are present here as no-ops so consumers can
 * already wire `apiRef` against the final type signature.
 */

import type {
  AwesomeKanbanApi,
  AwesomeKanbanLocale,
  AwesomeKanbanProps,
  AwesomeKanbanState,
  Card,
  Column,
  Comment,
  Id,
  Link,
  Row,
} from '../types';
import { type EventBus } from './eventBus';
import { generateId } from './ordering';

export interface HistoryPort {
  push: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export interface ApiState {
  columns: Column[];
  rows: Row[];
  cards: Card[];
  links: Link[];
  selection: Id[];
}

export interface ApiCallbacks {
  setColumns: (next: Column[]) => void;
  setRows: (next: Row[]) => void;
  setCards: (next: Card[]) => void;
  setLinks: (next: Link[]) => void;
  setSelection: (next: Id[]) => void;
  setEditorCardId: (id: Id | null) => void;
  setDensity: (density: 'compact' | 'normal' | 'wide') => void;
  setPrimaryColor: (color: string) => void;
  setLocale: (locale: AwesomeKanbanLocale) => void;
  setConfig: (patch: Partial<AwesomeKanbanProps>) => void;
}

export function createApi(
  getState: () => ApiState,
  callbacks: ApiCallbacks,
  bus: EventBus,
  history: HistoryPort
): AwesomeKanbanApi {
  // Snapshot the current state into the history stack before applying any
  // mutation. Called from every mutating method below so consumers don't
  // have to track their own undo/redo logic.
  const pushHistory = () => history.push();
  const noop = () => {};
  void noop;

  const api: AwesomeKanbanApi = {
    // ─── Cards ────────────────────────────────────────────────────────────
    addCard(card, options) {
      pushHistory();
      const state = getState();
      const id = card.id ?? generateId('card');
      const next: Card = {
        ...card,
        id,
        label: card.label ?? '',
        columnId: card.columnId,
      };
      let cards = [...state.cards];
      if (options?.before !== undefined) {
        const idx = cards.findIndex((c) => c.id === options.before);
        if (idx >= 0) cards.splice(idx, 0, next);
        else cards.push(next);
      } else if (options?.after !== undefined) {
        const idx = cards.findIndex((c) => c.id === options.after);
        if (idx >= 0) cards.splice(idx + 1, 0, next);
        else cards.push(next);
      } else {
        cards.push(next);
      }
      callbacks.setCards(cards);
      bus.emit('card:add', { card: next });
      return id;
    },

    updateCard(id, patch) {
      pushHistory();
      const state = getState();
      const next = state.cards.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      );
      callbacks.setCards(next);
      bus.emit('card:update', { id, patch });
    },

    deleteCard(id) {
      pushHistory();
      const state = getState();
      const ids = new Set(Array.isArray(id) ? id : [id]);
      const removed = state.cards.filter((c) => ids.has(c.id));
      const next = state.cards.filter((c) => !ids.has(c.id));
      callbacks.setCards(next);
      callbacks.setSelection(state.selection.filter((s) => !ids.has(s)));
      bus.emit('card:delete', { id, cards: removed });
    },

    duplicateCard(id) {
      pushHistory();
      const state = getState();
      const ids = Array.isArray(id) ? id : [id];
      const newIds: Id[] = [];
      const additions: Card[] = [];
      for (const cardId of ids) {
        const original = state.cards.find((c) => c.id === cardId);
        if (!original) continue;
        const newId = generateId('card');
        newIds.push(newId);
        additions.push({ ...original, id: newId });
      }
      callbacks.setCards([...state.cards, ...additions]);
      bus.emit('card:duplicate', { ids, newIds });
      return newIds;
    },

    moveCard(id, target) {
      pushHistory();
      const state = getState();
      const ids = new Set(Array.isArray(id) ? id : [id]);
      const moving = state.cards.filter((c) => ids.has(c.id));
      if (moving.length === 0) return;
      const remaining = state.cards.filter((c) => !ids.has(c.id));
      const updated = moving.map((c) => ({
        ...c,
        columnId: target.columnId,
        rowId: target.rowId ?? c.rowId,
      }));

      let result: Card[];
      if (target.before !== undefined) {
        const idx = remaining.findIndex((c) => c.id === target.before);
        if (idx >= 0) {
          result = [
            ...remaining.slice(0, idx),
            ...updated,
            ...remaining.slice(idx),
          ];
        } else {
          result = [...remaining, ...updated];
        }
      } else if (target.after !== undefined) {
        const idx = remaining.findIndex((c) => c.id === target.after);
        if (idx >= 0) {
          result = [
            ...remaining.slice(0, idx + 1),
            ...updated,
            ...remaining.slice(idx + 1),
          ];
        } else {
          result = [...remaining, ...updated];
        }
      } else {
        result = [...remaining, ...updated];
      }

      callbacks.setCards(result);
      const first = updated[0];
      if (first) {
        bus.emit('card:move', {
          id: first.id,
          source: updated.map((c) => c.id),
          fromColumnId: moving[0]!.columnId,
          fromRowId: moving[0]!.rowId ?? null,
          toColumnId: target.columnId,
          toRowId: target.rowId ?? null,
          before: target.before,
          after: target.after,
        });
      }
    },

    selectCard(id, options) {
      const state = getState();
      const ids = Array.isArray(id) ? id : [id];
      const next = options?.append
        ? Array.from(new Set([...state.selection, ...ids]))
        : ids;
      callbacks.setSelection(next);
      bus.emit('card:selection', { selectedIds: next });
    },

    getSelection() {
      return [...getState().selection];
    },

    clearSelection() {
      callbacks.setSelection([]);
      bus.emit('card:selection', { selectedIds: [] });
    },

    // ─── Columns ──────────────────────────────────────────────────────────
    addColumn(args) {
      pushHistory();
      const state = getState();
      const id = args.id ?? args.column.id ?? generateId('col');
      const next: Column = {
        id,
        label: args.column.label ?? '',
        ...args.column,
      };
      let cols = [...state.columns];
      if (args.before !== undefined) {
        const idx = cols.findIndex((c) => c.id === args.before);
        if (idx >= 0) cols.splice(idx, 0, next);
        else cols.push(next);
      } else if (args.after !== undefined) {
        const idx = cols.findIndex((c) => c.id === args.after);
        if (idx >= 0) cols.splice(idx + 1, 0, next);
        else cols.push(next);
      } else {
        cols.push(next);
      }
      callbacks.setColumns(cols);
      bus.emit('column:add', { column: next });
      return id;
    },

    updateColumn(id, patch) {
      pushHistory();
      const state = getState();
      const next = state.columns.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      );
      callbacks.setColumns(next);
      bus.emit('column:update', { id, patch });
    },

    deleteColumn(id, options) {
      pushHistory();
      const state = getState();
      const removedCards = state.cards.filter((c) => c.columnId === id);
      let nextCards = state.cards;
      if (options?.reassignTo !== undefined) {
        const target = options.reassignTo;
        nextCards = state.cards.map((c) =>
          c.columnId === id ? { ...c, columnId: target } : c
        );
      } else {
        nextCards = state.cards.filter((c) => c.columnId !== id);
      }
      callbacks.setColumns(state.columns.filter((c) => c.id !== id));
      callbacks.setCards(nextCards);
      bus.emit('column:delete', { id, cards: removedCards });
    },

    moveColumn(id, target) {
      pushHistory();
      const state = getState();
      const idx = state.columns.findIndex((c) => c.id === id);
      if (idx < 0) return;
      const item = state.columns[idx]!;
      const without = state.columns.filter((_, i) => i !== idx);
      let result: Column[];
      if (target.before !== undefined) {
        const i = without.findIndex((c) => c.id === target.before);
        result =
          i >= 0
            ? [...without.slice(0, i), item, ...without.slice(i)]
            : [...without, item];
      } else if (target.after !== undefined) {
        const i = without.findIndex((c) => c.id === target.after);
        result =
          i >= 0
            ? [...without.slice(0, i + 1), item, ...without.slice(i + 1)]
            : [...without, item];
      } else {
        result = [...without, item];
      }
      callbacks.setColumns(result);
      bus.emit('column:move', {
        id,
        before: target.before,
        after: target.after,
      });
    },

    collapseColumn(id) {
      api.updateColumn(id, { collapsed: true });
      bus.emit('column:collapse', { id, collapsed: true });
    },

    expandColumn(id) {
      api.updateColumn(id, { collapsed: false });
      bus.emit('column:collapse', { id, collapsed: false });
    },

    toggleColumn(id) {
      const col = getState().columns.find((c) => c.id === id);
      if (!col) return;
      api.updateColumn(id, { collapsed: !col.collapsed });
      bus.emit('column:collapse', { id, collapsed: !col.collapsed });
    },

    // ─── Rows ─────────────────────────────────────────────────────────────
    addRow(args) {
      pushHistory();
      const state = getState();
      const id = args.id ?? args.row.id ?? generateId('row');
      const next: Row = {
        id,
        label: args.row.label ?? '',
        ...args.row,
      };
      let rows = [...state.rows];
      if (args.before !== undefined) {
        const idx = rows.findIndex((r) => r.id === args.before);
        if (idx >= 0) rows.splice(idx, 0, next);
        else rows.push(next);
      } else if (args.after !== undefined) {
        const idx = rows.findIndex((r) => r.id === args.after);
        if (idx >= 0) rows.splice(idx + 1, 0, next);
        else rows.push(next);
      } else {
        rows.push(next);
      }
      callbacks.setRows(rows);
      bus.emit('row:add', { row: next });
      return id;
    },

    updateRow(id, patch) {
      pushHistory();
      const state = getState();
      const next = state.rows.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      );
      callbacks.setRows(next);
      bus.emit('row:update', { id, patch });
    },

    deleteRow(id, options) {
      pushHistory();
      const state = getState();
      const removedCards = state.cards.filter((c) => c.rowId === id);
      let nextCards = state.cards;
      if (options?.reassignTo !== undefined) {
        const target = options.reassignTo;
        nextCards = state.cards.map((c) =>
          c.rowId === id ? { ...c, rowId: target } : c
        );
      }
      callbacks.setRows(state.rows.filter((r) => r.id !== id));
      callbacks.setCards(nextCards);
      bus.emit('row:delete', { id, cards: removedCards });
    },

    moveRow(id, target) {
      pushHistory();
      const state = getState();
      const idx = state.rows.findIndex((r) => r.id === id);
      if (idx < 0) return;
      const item = state.rows[idx]!;
      const without = state.rows.filter((_, i) => i !== idx);
      let result: Row[];
      if (target.before !== undefined) {
        const i = without.findIndex((r) => r.id === target.before);
        result =
          i >= 0
            ? [...without.slice(0, i), item, ...without.slice(i)]
            : [...without, item];
      } else if (target.after !== undefined) {
        const i = without.findIndex((r) => r.id === target.after);
        result =
          i >= 0
            ? [...without.slice(0, i + 1), item, ...without.slice(i + 1)]
            : [...without, item];
      } else {
        result = [...without, item];
      }
      callbacks.setRows(result);
      bus.emit('row:move', { id, before: target.before, after: target.after });
    },

    collapseRow(id) {
      api.updateRow(id, { collapsed: true });
      bus.emit('row:collapse', { id, collapsed: true });
    },

    expandRow(id) {
      api.updateRow(id, { collapsed: false });
      bus.emit('row:collapse', { id, collapsed: false });
    },

    toggleRow(id) {
      const row = getState().rows.find((r) => r.id === id);
      if (!row) return;
      api.updateRow(id, { collapsed: !row.collapsed });
      bus.emit('row:collapse', { id, collapsed: !row.collapsed });
    },

    // ─── Links ────────────────────────────────────────────────────────────
    addLink(link) {
      pushHistory();
      const state = getState();
      const id = link.id ?? generateId('link');
      const next: Link = { ...link, id };
      callbacks.setLinks([...state.links, next]);
      bus.emit('link:add', { link: next });
      return id;
    },

    deleteLink(id) {
      pushHistory();
      const state = getState();
      callbacks.setLinks(state.links.filter((l) => l.id !== id));
      bus.emit('link:delete', { id });
    },

    // ─── Comments ─────────────────────────────────────────────────────────
    addComment(cardId, comment) {
      pushHistory();
      const state = getState();
      const id = comment.id ?? generateId('comment');
      const next: Comment = {
        id,
        userId: comment.userId,
        text: comment.text,
        date: comment.date ?? new Date(),
      };
      callbacks.setCards(
        state.cards.map((c) =>
          c.id === cardId
            ? { ...c, comments: [...(c.comments ?? []), next] }
            : c
        )
      );
      bus.emit('comment:add', { cardId, comment: next });
      return id;
    },

    updateComment(cardId, commentId, text) {
      pushHistory();
      const state = getState();
      callbacks.setCards(
        state.cards.map((c) => {
          if (c.id !== cardId) return c;
          const comments = (c.comments ?? []).map((cm) =>
            cm.id === commentId ? { ...cm, text, edited: true } : cm
          );
          return { ...c, comments };
        })
      );
      const card = state.cards.find((c) => c.id === cardId);
      const found = card?.comments?.find((cm) => cm.id === commentId);
      if (found) {
        bus.emit('comment:update', {
          cardId,
          comment: { ...found, text, edited: true },
        });
      }
    },

    deleteComment(cardId, commentId) {
      pushHistory();
      const state = getState();
      const card = state.cards.find((c) => c.id === cardId);
      const found = card?.comments?.find((cm) => cm.id === commentId);
      callbacks.setCards(
        state.cards.map((c) => {
          if (c.id !== cardId) return c;
          return {
            ...c,
            comments: (c.comments ?? []).filter((cm) => cm.id !== commentId),
          };
        })
      );
      if (found) bus.emit('comment:delete', { cardId, comment: found });
    },

    // ─── Editor ───────────────────────────────────────────────────────────
    openEditor(cardId) {
      callbacks.setEditorCardId(cardId);
    },

    closeEditor() {
      callbacks.setEditorCardId(null);
    },

    // ─── Search / data ────────────────────────────────────────────────────
    search(query, fields = ['label', 'description']) {
      const q = query.trim().toLowerCase();
      if (!q) return getState().cards;
      return getState().cards.filter((card) =>
        fields.some((f) => {
          const v = (card as Record<string, unknown>)[f];
          return typeof v === 'string' && v.toLowerCase().includes(q);
        })
      );
    },

    parse(data) {
      if (data.columns) callbacks.setColumns(data.columns);
      if (data.rows) callbacks.setRows(data.rows);
      if (data.cards) callbacks.setCards(data.cards);
      if (data.links) callbacks.setLinks(data.links);
    },

    serialize() {
      const s = getState();
      return {
        columns: s.columns,
        rows: s.rows,
        cards: s.cards,
        links: s.links,
      };
    },

    // ─── History ──────────────────────────────────────────────────────────
    undo: () => history.undo(),
    redo: () => history.redo(),
    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),
    clearHistory: () => history.clear(),

    // ─── Runtime config ───────────────────────────────────────────────────
    setConfig(patch) {
      callbacks.setConfig(patch);
    },
    setDensity(density) {
      callbacks.setDensity(density);
    },
    setPrimaryColor(color) {
      callbacks.setPrimaryColor(color);
    },
    setLocale(locale) {
      callbacks.setLocale(locale);
    },

    // ─── Event bus ────────────────────────────────────────────────────────
    on: bus.on,
    off: bus.off,
    emit: bus.emit,
    intercept: bus.intercept,

    // ─── Export ───────────────────────────────────────────────────────────
    exportToJSON() {
      return JSON.stringify(api.serialize(), null, 2);
    },
    exportToCSV() {
      const cards = getState().cards;
      if (cards.length === 0) return '';
      const keys = Array.from(
        new Set(cards.flatMap((c) => Object.keys(c)))
      ).filter((k) => typeof k === 'string');
      const header = keys.join(',');
      const rows = cards.map((c) =>
        keys
          .map((k) => {
            const v = (c as Record<string, unknown>)[k];
            if (v == null) return '';
            const s =
              typeof v === 'string'
                ? v
                : typeof v === 'object'
                  ? JSON.stringify(v)
                  : String(v);
            const escaped = s.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      );
      return [header, ...rows].join('\n');
    },

    // ─── State ────────────────────────────────────────────────────────────
    getState() {
      return { ...getState() };
    },
    getReactiveState() {
      return getState();
    },
  };

  return api;
}

export type { AwesomeKanbanState };
