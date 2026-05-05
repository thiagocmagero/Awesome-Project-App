import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
} from '@hello-pangea/dnd';
import type {
  AwesomeKanbanApi,
  AwesomeKanbanLocale,
  AwesomeKanbanProps,
  Card,
  CardMenuItem,
  Column,
  Id,
  MenuItem,
  Row,
} from './types';
import {
  defaultCardMenuItems,
  defaultColumnMenuItems,
  defaultLocale,
  defaultRowMenuItems,
} from './core/defaults';
import { activeVariant, softVariant } from './core/colors';
import { createApi } from './core/api';
import { createEventBus } from './core/eventBus';
import { useKanbanState } from './hooks/useKanbanState';
import { useKanbanSelection } from './hooks/useKanbanSelection';
import { useKanbanDnd } from './hooks/useKanbanDnd';
import { useKanbanHistory } from './hooks/useKanbanHistory';
import { KanbanColumn } from './components/KanbanColumn';
import { KanbanRow } from './components/KanbanRow';
import { KanbanCell } from './components/KanbanCell';
import { KanbanCardOverlay } from './components/KanbanCardOverlay';
import {
  KanbanContextMenu,
  type ContextMenuItemRender,
} from './components/KanbanContextMenu';
import { KanbanConfirmDialog } from './components/KanbanConfirmDialog';
import { KanbanEditor } from './components/editor/KanbanEditor';

function toRender<T>(items: MenuItem<T>[]): ContextMenuItemRender[] {
  return items.map((item) => ({
    id: item.id,
    text: item.text,
    icon: item.icon,
    iconColor: item.iconColor,
    disabled: item.disabled,
    separator: item.separator,
    destructive: item.destructive,
    shortcut: item.shortcut,
    section: item.section,
    children: item.data ? toRender(item.data) : undefined,
  }));
}

function findItemById<T>(
  items: MenuItem<T>[] | undefined,
  id: string
): MenuItem<T> | undefined {
  if (!items) return undefined;
  for (const item of items) {
    if (item.id === id) return item;
    if (item.data) {
      const nested = findItemById(item.data, id);
      if (nested) return nested;
    }
  }
  return undefined;
}

function isReadonly(
  readonly: AwesomeKanbanProps['readonly'],
  domain: 'cards' | 'columns' | 'rows',
  action: 'add' | 'edit' | 'delete' | 'move'
): boolean {
  if (readonly === true) return true;
  if (!readonly) return false;
  const granular = readonly[domain];
  if (!granular) return false;
  return !!granular[action];
}

export function AwesomeKanban(props: AwesomeKanbanProps) {
  const {
    cardShape,
    columnShape,
    rowShape,
    editorShape,
    className,
    density: densityProp = 'compact',
    primaryColor: primaryColorProp = '#7c5cff',
    columnAccentStyle = 'cap',
    priorityStyle = 'pill',
    readonly = false,
    editor,
    locale: localeProp = defaultLocale,
    rowKey = 'rowId',
    onCardAdd,
    onCardUpdate,
    onCardDelete,
    onCardMove,
    onCardDuplicate,
    onCardClick,
    onCardDoubleClick,
    onCardSelectionChange,
    onColumnAdd,
    onColumnUpdate,
    onColumnDelete,
    onColumnMove,
    onColumnCollapse,
    onRowAdd,
    onRowUpdate,
    onRowDelete,
    onRowMove,
    onRowCollapse,
    onLinkAdd,
    onLinkDelete,
    onCommentAdd,
    onCommentUpdate,
    onCommentDelete,
    onVote,
    onAddSubtask,
    onCommentClick,
    onAddCard: onAddCardOverride,
    onChange,
    apiRef,
  } = props;

  // ─── Runtime config (mutable via the API) ─────────────────────────────
  const [density, setDensity] = useState(densityProp);
  const [primaryColor, setPrimaryColor] = useState(primaryColorProp);
  const [locale, setLocale] = useState<AwesomeKanbanLocale>(localeProp);
  const [editorCardId, setEditorCardId] = useState<Id | null>(null);
  const [configOverride, setConfigOverride] = useState<
    Partial<AwesomeKanbanProps>
  >({});

  // Sync runtime values with prop changes
  useEffect(() => setDensity(densityProp), [densityProp]);
  useEffect(() => setPrimaryColor(primaryColorProp), [primaryColorProp]);
  useEffect(() => setLocale(localeProp), [localeProp]);

  const effectiveProps = { ...props, ...configOverride };

  // ─── Data state ───────────────────────────────────────────────────────
  const {
    columns,
    rows,
    cards,
    links,
    selection,
    setColumns,
    setRows,
    setCards,
    setLinks,
    setSelection,
    getState,
  } = useKanbanState({
    columns: effectiveProps.columns,
    rows: effectiveProps.rows,
    cards: effectiveProps.cards,
    links: effectiveProps.links,
    defaultColumns: effectiveProps.defaultColumns,
    defaultRows: effectiveProps.defaultRows,
    defaultCards: effectiveProps.defaultCards,
    defaultLinks: effectiveProps.defaultLinks,
    onChange,
  });

  // ─── Selection ────────────────────────────────────────────────────────
  const sel = useKanbanSelection({
    selection,
    setSelection,
    cards,
    multiselect: effectiveProps.multiselect ?? true,
    onSelectionChange: onCardSelectionChange,
  });

  // ─── Event bus ────────────────────────────────────────────────────────
  const busRef = useRef(createEventBus());
  const bus = busRef.current;

  // ─── History (undo / redo) ───────────────────────────────────────────
  const historyEnabled =
    effectiveProps.history === undefined || effectiveProps.history !== false;
  const undoLimit =
    typeof effectiveProps.history === 'object'
      ? (effectiveProps.history.undoLimit ?? 50)
      : 50;
  const history = useKanbanHistory({
    enabled: historyEnabled,
    undoLimit,
    getSnapshot: () => {
      const s = getState();
      return {
        columns: s.columns,
        rows: s.rows,
        cards: s.cards,
        links: s.links,
      };
    },
    applySnapshot: (snap) => {
      setColumns(snap.columns);
      setRows(snap.rows);
      setCards(snap.cards);
      setLinks(snap.links);
    },
  });

  // ─── Imperative API ───────────────────────────────────────────────────
  const apiCallbacks = useMemo(
    () => ({
      setColumns,
      setRows,
      setCards,
      setLinks,
      setSelection,
      setEditorCardId,
      setDensity,
      setPrimaryColor,
      setLocale,
      setConfig: (patch: Partial<AwesomeKanbanProps>) =>
        setConfigOverride((prev) => ({ ...prev, ...patch })),
    }),
    [setColumns, setRows, setCards, setLinks, setSelection]
  );

  const api: AwesomeKanbanApi = useMemo(
    () => createApi(getState, apiCallbacks, bus, history),
    [getState, apiCallbacks, bus, history]
  );

  // ─── Drag & Drop ──────────────────────────────────────────────────────
  const dnd = useKanbanDnd({
    cards,
    columns,
    rows,
    selection,
    rowKey,
    enabled: effectiveProps.dragMode !== 'none',
  });

  // ─── Context menus ────────────────────────────────────────────────────
  type MenuKind = 'card' | 'column' | 'row';
  interface ActiveMenu {
    kind: MenuKind;
    targetId: Id;
    anchor: { x: number; y: number };
    items: ContextMenuItemRender[];
    rawItems: MenuItem<unknown>[];
  }
  interface ConfirmState {
    title?: string;
    message: string;
    destructive?: boolean;
    onConfirm: () => void;
  }
  const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  // Inline rename — only one column or one row may be in edit mode at a time.
  const [editingColumnId, setEditingColumnId] = useState<Id | null>(null);
  const [editingRowId, setEditingRowId] = useState<Id | null>(null);

  const askConfirm = useCallback((state: ConfirmState) => {
    setConfirmState(state);
  }, []);

  const resolveMenuItems = useCallback(
    (kind: MenuKind, target: Card | Column | Row): MenuItem<unknown>[] | null => {
      const ro = readonly === true;
      if (kind === 'card') {
        const config = (cardShape?.menu ?? {}) as
          | boolean
          | { show?: boolean; items?: unknown };
        if (config === false) return null;
        if (typeof config === 'object' && config.show === false) return null;
        const itemsCfg =
          typeof config === 'object' ? config.items : undefined;
        if (typeof itemsCfg === 'function') {
          const result = (itemsCfg as (
            ctx: { card: Card; readonly: boolean; selected: Id[] }
          ) => CardMenuItem[] | null | false)({
            card: target as Card,
            readonly: ro,
            selected: selection,
          });
          if (!result) return null;
          return result as MenuItem<unknown>[];
        }
        if (Array.isArray(itemsCfg)) return itemsCfg as MenuItem<unknown>[];
        return defaultCardMenuItems as unknown as MenuItem<unknown>[];
      }
      if (kind === 'column') {
        const config = columnShape?.menu;
        if (config?.show === false) return null;
        const itemsCfg = config?.items;
        if (typeof itemsCfg === 'function') {
          const result = itemsCfg({
            column: target as Column,
            columnIndex: columns.findIndex((c) => c.id === target.id),
            columns,
            readonly: ro,
          });
          if (!result) return null;
          return result as unknown as MenuItem<unknown>[];
        }
        if (Array.isArray(itemsCfg))
          return itemsCfg as unknown as MenuItem<unknown>[];
        return defaultColumnMenuItems as unknown as MenuItem<unknown>[];
      }
      // row
      const config = rowShape?.menu;
      if (config?.show === false) return null;
      const itemsCfg = config?.items;
      const rowIndex = rows.findIndex((r) => r.id === target.id);
      const applyRowDisabled = (items: MenuItem<unknown>[]): MenuItem<unknown>[] => {
        const isFirst = rowIndex === 0;
        const isLast = rowIndex === rows.length - 1;
        const isPrimary = (target as Row).data?.isPrimary === true;
        return items.map((item) => {
          if (item.id === 'move-up' && isFirst)   return { ...item, disabled: true };
          if (item.id === 'move-down' && isLast)  return { ...item, disabled: true };
          if (item.id === 'delete-row' && isPrimary && rows.length > 1)
            return { ...item, disabled: true };
          return item;
        });
      };
      if (typeof itemsCfg === 'function') {
        const result = itemsCfg({
          row: target as Row,
          rowIndex,
          rows,
          readonly: ro,
        });
        if (!result) return null;
        return applyRowDisabled(result as unknown as MenuItem<unknown>[]);
      }
      if (Array.isArray(itemsCfg))
        return applyRowDisabled(itemsCfg as unknown as MenuItem<unknown>[]);
      return applyRowDisabled(defaultRowMenuItems as unknown as MenuItem<unknown>[]);
    },
    [cardShape, columnShape, rowShape, readonly, columns, rows, selection]
  );

  const openMenu = useCallback(
    (kind: MenuKind, targetId: Id, e: { clientX: number; clientY: number }) => {
      const target =
        kind === 'card'
          ? cards.find((c) => c.id === targetId)
          : kind === 'column'
            ? columns.find((c) => c.id === targetId)
            : rows.find((r) => r.id === targetId);
      if (!target) return;
      const raw = resolveMenuItems(kind, target);
      if (!raw) return;
      setActiveMenu({
        kind,
        targetId,
        anchor: { x: e.clientX, y: e.clientY },
        items: toRender(raw),
        rawItems: raw,
      });
    },
    [cards, columns, rows, resolveMenuItems]
  );

  const closeMenu = useCallback(() => setActiveMenu(null), []);

  // ─── Built-in action dispatcher ──────────────────────────────────────
  const handleMenuSelect = useCallback(
    (id: string) => {
      if (!activeMenu) return;
      const { kind, targetId, rawItems } = activeMenu;
      const item = findItemById(rawItems, id);

      // Resolve target object for ctx
      const resolveTarget = () =>
        kind === 'card'
          ? cards.find((c) => c.id === targetId)
          : kind === 'column'
            ? columns.find((c) => c.id === targetId)
            : rows.find((r) => r.id === targetId);

      const target = resolveTarget();
      if (!target) {
        closeMenu();
        return;
      }

      // Run user-provided onClick first (so they can intercept and short-
      // circuit; built-in dispatch still runs unless they have a custom id).
      if (item?.onClick) {
        const ctx =
          kind === 'card'
            ? { id, item, card: target as Card }
            : kind === 'column'
              ? { id, item, column: target as Column }
              : { id, item, row: target as Row };
        (item.onClick as (ctx: unknown) => void)(ctx);
      }

      // Built-in dispatch
      if (kind === 'card') {
        const card = target as Card;
        switch (id) {
          case 'set-edit':
            api.openEditor(card.id);
            break;
          case 'duplicate-card':
            api.duplicateCard(card.id);
            break;
          case 'delete-card': {
            const doDelete = () => api.deleteCard(card.id);
            if (cardShape?.confirmDeletion) {
              askConfirm({
                title: locale.confirm.deleteCard,
                message: card.label,
                destructive: true,
                onConfirm: doDelete,
              });
            } else {
              doDelete();
            }
            break;
          }
          case 'move-up':
          case 'move-down': {
            const sameCellCards = cards.filter(
              (c) =>
                c.columnId === card.columnId &&
                ((c as Record<string, unknown>)[rowKey] ?? null) ===
                  ((card as Record<string, unknown>)[rowKey] ?? null)
            );
            const idx = sameCellCards.findIndex((c) => c.id === card.id);
            const targetIdx = id === 'move-up' ? idx - 1 : idx + 1;
            if (targetIdx >= 0 && targetIdx < sameCellCards.length) {
              const sibling = sameCellCards[targetIdx]!;
              api.moveCard(card.id, {
                columnId: card.columnId,
                rowId: (card as Record<string, unknown>)[rowKey] as
                  | Id
                  | undefined,
                ...(id === 'move-up'
                  ? { before: sibling.id }
                  : { after: sibling.id }),
              });
            }
            break;
          }
        }
      } else if (kind === 'column') {
        const column = target as Column;
        switch (id) {
          case 'set-edit': {
            // Inline rename — header transforms into an editable input that
            // auto-focuses and selects the current text. Save on Enter/blur,
            // cancel on Esc / empty value.
            setEditingColumnId(column.id);
            setEditingRowId(null);
            break;
          }
          case 'add-card': {
            const newId = api.addCard({
              columnId: column.id,
              label: 'New task',
            });
            api.openEditor(newId);
            break;
          }
          case 'collapse':
          case 'expand':
            api.toggleColumn(column.id);
            break;
          case 'move-left':
          case 'move-right': {
            const idx = columns.findIndex((c) => c.id === column.id);
            const targetIdx = id === 'move-left' ? idx - 1 : idx + 1;
            if (targetIdx >= 0 && targetIdx < columns.length) {
              const sibling = columns[targetIdx]!;
              api.moveColumn(column.id, {
                ...(id === 'move-left'
                  ? { before: sibling.id }
                  : { after: sibling.id }),
              });
            }
            break;
          }
          case 'delete-column': {
            const cellCards = cards.filter((c) => c.columnId === column.id);
            const doDelete = () => api.deleteColumn(column.id);
            if (columnShape?.confirmDeletion || cellCards.length > 0) {
              askConfirm({
                title: locale.confirm.deleteColumn,
                message: column.label,
                destructive: true,
                onConfirm: doDelete,
              });
            } else {
              doDelete();
            }
            break;
          }
        }
      } else {
        const row = target as Row;
        switch (id) {
          case 'set-edit': {
            setEditingRowId(row.id);
            setEditingColumnId(null);
            break;
          }
          case 'collapse':
          case 'expand':
            api.toggleRow(row.id);
            break;
          case 'move-up':
          case 'move-down': {
            const idx = rows.findIndex((r) => r.id === row.id);
            const targetIdx = id === 'move-up' ? idx - 1 : idx + 1;
            if (targetIdx >= 0 && targetIdx < rows.length) {
              const sibling = rows[targetIdx]!;
              api.moveRow(row.id, {
                ...(id === 'move-up'
                  ? { before: sibling.id }
                  : { after: sibling.id }),
              });
            }
            break;
          }
          case 'delete-row': {
            const cellCards = cards.filter(
              (c) => (c as Record<string, unknown>)[rowKey] === row.id
            );
            const doDelete = () => api.deleteRow(row.id);
            if (rowShape?.confirmDeletion || cellCards.length > 0) {
              askConfirm({
                title: locale.confirm.deleteRow,
                message: row.label,
                destructive: true,
                onConfirm: doDelete,
              });
            } else {
              doDelete();
            }
            break;
          }
        }
      }
      closeMenu();
    },
    [
      activeMenu,
      api,
      askConfirm,
      cardShape,
      cards,
      closeMenu,
      columnShape,
      columns,
      locale,
      rowKey,
      rowShape,
      rows,
    ]
  );

  useImperativeHandle(apiRef, () => api, [api]);

  // ─── data-menu-id global delegation ───────────────────────────────────
  // Custom card / column / row templates can mark any element as a menu
  // trigger by adding `data-menu-id={card.id}` (or column/row id). We catch
  // those clicks here and route to the correct menu — no plumbing needed
  // from the consumer template.
  const handleBoardClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const target = e.target as HTMLElement | null;
      const trigger = target?.closest<HTMLElement>('[data-menu-id]');
      if (!trigger) return;
      // Built-in `...` buttons stopPropagation in their own onClick, so this
      // delegation only fires for custom templates that opt in via
      // `data-menu-id={...}` without their own click handler.
      const rawId = trigger.getAttribute('data-menu-id');
      if (rawId === null) return;
      // Resolve which kind based on whether the id matches a card / column / row.
      const matchingCard = cards.find((c) => String(c.id) === rawId);
      if (matchingCard) {
        e.preventDefault();
        e.stopPropagation();
        openMenu('card', matchingCard.id, e);
        return;
      }
      const matchingColumn = columns.find((c) => String(c.id) === rawId);
      if (matchingColumn) {
        e.preventDefault();
        e.stopPropagation();
        openMenu('column', matchingColumn.id, e);
        return;
      }
      const matchingRow = rows.find((r) => String(r.id) === rawId);
      if (matchingRow) {
        e.preventDefault();
        e.stopPropagation();
        openMenu('row', matchingRow.id, e);
      }
    },
    [cards, columns, rows, openMenu]
  );

  // Bridge bus → external prop callbacks (so apps that wired to the API
  // don't lose events). Every prop callback in `AwesomeKanbanProps` is wired
  // here so controlled apps can react to API mutations they didn't trigger.
  useEffect(() => {
    const offs: Array<() => void> = [];
    if (onCardAdd) offs.push(bus.on('card:add', onCardAdd));
    if (onCardUpdate) offs.push(bus.on('card:update', onCardUpdate));
    if (onCardDelete) offs.push(bus.on('card:delete', onCardDelete));
    if (onCardMove) offs.push(bus.on('card:move', onCardMove));
    if (onCardDuplicate) offs.push(bus.on('card:duplicate', onCardDuplicate));
    if (onColumnAdd) offs.push(bus.on('column:add', onColumnAdd));
    if (onColumnUpdate) offs.push(bus.on('column:update', onColumnUpdate));
    if (onColumnDelete) offs.push(bus.on('column:delete', onColumnDelete));
    if (onColumnMove) offs.push(bus.on('column:move', onColumnMove));
    if (onColumnCollapse) offs.push(bus.on('column:collapse', onColumnCollapse));
    if (onRowAdd) offs.push(bus.on('row:add', onRowAdd));
    if (onRowUpdate) offs.push(bus.on('row:update', onRowUpdate));
    if (onRowDelete) offs.push(bus.on('row:delete', onRowDelete));
    if (onRowMove) offs.push(bus.on('row:move', onRowMove));
    if (onRowCollapse) offs.push(bus.on('row:collapse', onRowCollapse));
    if (onLinkAdd) offs.push(bus.on('link:add', onLinkAdd));
    if (onLinkDelete) offs.push(bus.on('link:delete', onLinkDelete));
    if (onCommentAdd) offs.push(bus.on('comment:add', onCommentAdd));
    if (onCommentUpdate) offs.push(bus.on('comment:update', onCommentUpdate));
    if (onCommentDelete) offs.push(bus.on('comment:delete', onCommentDelete));
    if (onVote)
      offs.push(
        bus.on('vote', (e) => {
          onVote(e);
        })
      );

    // Live-region announcements for screen-reader users — fire on the most
    // perceptible state changes (move + delete) without becoming chatty.
    offs.push(
      bus.on('card:move', (e) => {
        const target = columns.find((c) => c.id === e.toColumnId);
        const moved = cards.find((c) => c.id === e.id);
        if (target && moved) {
          announce(`Card "${moved.label}" moved to ${target.label}.`);
        }
      })
    );
    offs.push(
      bus.on('column:move', (e) => {
        const col = columns.find((c) => c.id === e.id);
        if (col) announce(`Column "${col.label}" reordered.`);
      })
    );
    offs.push(
      bus.on('row:move', (e) => {
        const row = rows.find((r) => r.id === e.id);
        if (row) announce(`Swimlane "${row.label}" reordered.`);
      })
    );

    return () => offs.forEach((off) => off());
  }, [
    bus,
    onCardAdd,
    onCardUpdate,
    onCardDelete,
    onCardMove,
    onCardDuplicate,
    onColumnAdd,
    onColumnUpdate,
    onColumnDelete,
    onColumnMove,
    onColumnCollapse,
    onRowAdd,
    onRowUpdate,
    onRowDelete,
    onRowMove,
    onRowCollapse,
    onLinkAdd,
    onLinkDelete,
    onCommentAdd,
    onCommentUpdate,
    onCommentDelete,
    onVote,
  ]);

  // ─── Derived: card grouping ──────────────────────────────────────────
  // Buckets that drive rendering of cells / columns. With hello-pangea/dnd
  // the library handles in-flight preview (placeholder + auto-shift) on its
  // own; we don't need to optimistically re-bucket cards mid-drag.
  const cardsByColumn = useMemo(() => {
    const map = new Map<Id, Card[]>();
    for (const card of cards) {
      const list = map.get(card.columnId);
      if (list) list.push(card);
      else map.set(card.columnId, [card]);
    }
    return map;
  }, [cards]);

  const cardsByCell = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const card of cards) {
      const rowId = (card as Record<string, unknown>)[rowKey] ?? null;
      const key = `${card.columnId}::${rowId ?? ''}`;
      const list = map.get(key);
      if (list) list.push(card);
      else map.set(key, [card]);
    }
    return map;
  }, [cards, rowKey]);

  const hasSwimlanes = rows.length > 0;

  // ─── Editor user roster ──────────────────────────────────────────────
  // Pulled from cardShape.users.values so the editor can resolve names /
  // avatars in comments without the consumer threading a separate prop.
  const editorUsers = useMemo(() => {
    const u = cardShape?.users;
    if (!u || typeof u === 'boolean') return undefined;
    return u.values;
  }, [cardShape]);

  // ─── Search dim ──────────────────────────────────────────────────────
  const searchQuery = effectiveProps.searchQuery ?? '';
  const searchFields = effectiveProps.searchFields ?? ['label', 'description'];
  const dimmedSet = useMemo<Set<Id> | null>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const set = new Set<Id>();
    for (const card of cards) {
      const matches = searchFields.some((f) => {
        const v = (card as Record<string, unknown>)[f];
        return typeof v === 'string' && v.toLowerCase().includes(q);
      });
      if (!matches) set.add(card.id);
    }
    return set;
  }, [cards, searchQuery, searchFields]);

  const effectiveCardShape = useMemo(() => {
    if (!dimmedSet) return cardShape;
    const userCss = cardShape?.css;
    return {
      ...(cardShape ?? {}),
      css: (card: Card) => {
        const userClass = userCss?.(card) ?? '';
        const dimClass = dimmedSet.has(card.id) ? 'ak-card--dimmed' : '';
        const combined = [userClass, dimClass].filter(Boolean).join(' ');
        return combined || undefined;
      },
    };
  }, [cardShape, dimmedSet]);

  // ─── Theme / CSS variables ───────────────────────────────────────────
  const themeStyle = useMemo<CSSProperties>(() => {
    const style: Record<string, string | number> = {
      '--ak-primary': primaryColor,
      '--ak-primary-soft': softVariant(primaryColor),
      '--ak-primary-active': activeVariant(primaryColor),
      '--ak-column-count': columns.length || 1,
    };
    return style as CSSProperties;
  }, [primaryColor, columns]);

  // Each column gets its own grid track. Collapsed → 40px, expanded → bounded.
  // The cap (max 320px) prevents columns from stretching across the whole
  // viewport when only a few are expanded, which otherwise deforms cards.
  // `column.width` overrides everything for that column.
  const gridTemplateColumns = useMemo(
    () =>
      columns
        .map((c) => {
          if (c.collapsed) return '40px';
          if (c.width) return `${c.width}px`;
          return 'minmax(260px, 320px)';
        })
        .join(' '),
    [columns]
  );

  // ─── Card / column / row handlers ────────────────────────────────────
  const handleCardClick = useCallback(
    (card: Card, e: MouseEvent<HTMLElement>) => {
      onCardClick?.({ card, event: e });
      sel.toggle(card.id, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });

      // Auto-open editor on plain click (Mode 1 default).
      const editorIsCustom = typeof editor === 'function';
      const editorIsDisabled = editor === null || editor === false;
      if (
        !editorIsCustom &&
        !editorIsDisabled &&
        !(e.shiftKey || e.ctrlKey || e.metaKey)
      ) {
        setEditorCardId(card.id);
      }
    },
    [onCardClick, sel, editor]
  );

  const handleCardDoubleClick = useCallback(
    (card: Card, e: MouseEvent<HTMLElement>) => {
      onCardDoubleClick?.({ card, event: e });
    },
    [onCardDoubleClick]
  );

  const handleAddCard = useCallback(
    (columnId: Id, rowId?: Id) => {
      if (isReadonly(readonly, 'cards', 'add')) return;
      // External override — caller controls task creation (e.g. opens a modal).
      if (onAddCardOverride) {
        onAddCardOverride(columnId, rowId);
        return;
      }
      const newCard: Card & { columnId: Id } = {
        id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: 'New task',
        columnId,
        ...(rowId !== undefined ? { [rowKey]: rowId } : {}),
      } as Card;
      api.addCard(newCard);
      setEditorCardId(newCard.id);
    },
    [api, readonly, rowKey, onAddCardOverride]
  );

  const handleToggleCollapse = useCallback(
    (id: Id) => {
      api.toggleColumn(id);
    },
    [api]
  );

  const handleToggleRowCollapse = useCallback(
    (id: Id) => {
      api.toggleRow(id);
    },
    [api]
  );

  // ─── Live-region announcements ───────────────────────────────────────
  const [announcement, setAnnouncement] = useState('');
  const announce = useCallback((msg: string) => {
    // Reset to empty first so screen readers re-announce identical messages.
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(msg));
  }, []);

  // ─── Global Esc → clear selection ────────────────────────────────────
  // Registered on `window` (not on the board element) so it works even when
  // focus has wandered off the board. We bail out when the active element is
  // an editable field, when a Floating-UI overlay is mounted (context menu
  // / editor / confirm dialog handle their own Esc), and when the selection
  // is already empty.
  useEffect(() => {
    if (selection.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae) {
        const tag = ae.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          ae.isContentEditable
        )
          return;
      }
      if (
        document.querySelector(
          '.ak-menu, .ak-editor-backdrop, .ak-editor--sidebar, .ak-confirm'
        )
      ) {
        return;
      }
      e.preventDefault();
      sel.clear();
      announce('Selection cleared.');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selection, sel, announce]);

  // ─── Keyboard navigation between cards ───────────────────────────────
  // Arrow keys move focus between cards in the natural reading order.
  // Delete on a focused card deletes (with confirm dialog if configured).
  // Skips when focus is inside an editable element (input/textarea/select).
  const handleBoardKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Skip when typing in an input.
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      const focusedCard = target.closest<HTMLElement>('[data-card-id]');

      // Delete key on focused card
      if (
        focusedCard &&
        (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey))
      ) {
        const cardId = focusedCard.getAttribute('data-card-id');
        if (!cardId) return;
        const card = cards.find((c) => String(c.id) === cardId);
        if (!card) return;
        e.preventDefault();
        if (cardShape?.confirmDeletion) {
          setConfirmState({
            title: locale.confirm.deleteCard,
            message: card.label,
            destructive: true,
            onConfirm: () => {
              api.deleteCard(card.id);
              announce(`Card "${card.label}" deleted.`);
            },
          });
        } else {
          api.deleteCard(card.id);
          announce(`Card "${card.label}" deleted.`);
        }
        return;
      }

      // Arrow nav between cards
      if (
        focusedCard &&
        (e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown')
      ) {
        const board = e.currentTarget;
        const cardEls = Array.from(
          board.querySelectorAll<HTMLElement>('[data-card-id]')
        );
        if (cardEls.length === 0) return;
        const fromRect = focusedCard.getBoundingClientRect();
        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;

        let best: { el: HTMLElement; score: number } | null = null;
        for (const el of cardEls) {
          if (el === focusedCard) continue;
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = cx - fromX;
          const dy = cy - fromY;

          // Filter to candidates in the requested direction.
          if (e.key === 'ArrowRight' && dx <= 0) continue;
          if (e.key === 'ArrowLeft' && dx >= 0) continue;
          if (e.key === 'ArrowDown' && dy <= 0) continue;
          if (e.key === 'ArrowUp' && dy >= 0) continue;

          // Score: prefer closer in primary axis, lightly penalize off-axis
          // distance so the closest in-line target wins.
          const primary =
            e.key === 'ArrowLeft' || e.key === 'ArrowRight'
              ? Math.abs(dx)
              : Math.abs(dy);
          const cross =
            e.key === 'ArrowLeft' || e.key === 'ArrowRight'
              ? Math.abs(dy)
              : Math.abs(dx);
          const score = primary + cross * 1.5;

          if (!best || score < best.score) {
            best = { el, score };
          }
        }
        if (best) {
          e.preventDefault();
          best.el.focus();
        }
      }
    },
    [api, announce, cards, cardShape, locale, selection, sel]
  );

  // ─── Vote handler ────────────────────────────────────────────────────
  const handleVote = useCallback(
    (cardId: Id) => {
      if (effectiveProps.currentUser === undefined) return;
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      const userId = effectiveProps.currentUser;
      const votedBy = card.votedBy ?? [];
      const already = votedBy.includes(userId);
      const nextVotedBy = already
        ? votedBy.filter((u) => u !== userId)
        : [...votedBy, userId];
      api.updateCard(cardId, {
        votedBy: nextVotedBy,
        votes: nextVotedBy.length,
      });
      bus.emit('vote', { cardId, userId, voted: !already });
    },
    [api, bus, cards, effectiveProps.currentUser]
  );

  // ─── Add-subtask handler ─────────────────────────────────────────────
  const handleAddSubtask = useCallback(
    (parentId: Id) => {
      const card = cards.find((c) => c.id === parentId);
      onAddSubtask?.({ cardId: parentId, columnId: card?.columnId });
    },
    [cards, onAddSubtask]
  );

  // ─── Comment-click handler ───────────────────────────────────────────
  const handleCommentClick = useCallback(
    (cardId: Id) => {
      onCommentClick?.({ cardId });
    },
    [onCommentClick]
  );

  // ─── Editor save ─────────────────────────────────────────────────────
  const editorCard = useMemo(
    () => (editorCardId !== null ? cards.find((c) => c.id === editorCardId) ?? null : null),
    [editorCardId, cards]
  );

  const handleEditorSave = useCallback(
    (patch: Partial<Card>) => {
      if (!editorCard) return;
      api.updateCard(editorCard.id, patch);
      setEditorCardId(null);
    },
    [editorCard, api]
  );

  const handleEditorCancel = useCallback(() => {
    setEditorCardId(null);
  }, []);

  // ─── Inline rename handlers ──────────────────────────────────────────
  const handleColumnTitleStart = useCallback((column: Column) => {
    setEditingColumnId(column.id);
    setEditingRowId(null);
  }, []);

  const handleColumnTitleSubmit = useCallback(
    (column: Column, label: string) => {
      api.updateColumn(column.id, { label });
      setEditingColumnId(null);
    },
    [api]
  );

  const handleColumnTitleCancel = useCallback(() => {
    setEditingColumnId(null);
  }, []);

  const handleRowTitleStart = useCallback((row: Row) => {
    setEditingRowId(row.id);
    setEditingColumnId(null);
  }, []);

  const handleRowTitleSubmit = useCallback(
    (row: Row, label: string) => {
      api.updateRow(row.id, { label });
      setEditingRowId(null);
    },
    [api]
  );

  const handleRowTitleCancel = useCallback(() => {
    setEditingRowId(null);
  }, []);

  // ─── Menu trigger handlers ───────────────────────────────────────────
  const handleCardMenu = useCallback(
    (card: Card, e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu('card', card.id, e);
    },
    [openMenu]
  );

  const handleCardCtx = useCallback(
    (card: Card, e: MouseEvent<HTMLElement>) => {
      const config = cardShape?.menu;
      if (typeof config === 'object' && config?.rightClick === false) return;
      e.preventDefault();
      openMenu('card', card.id, e);
    },
    [openMenu, cardShape]
  );

  const handleColumnMenu = useCallback(
    (column: Column, e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu('column', column.id, e);
    },
    [openMenu]
  );

  const handleColumnCtx = useCallback(
    (column: Column, e: MouseEvent<HTMLElement>) => {
      if (columnShape?.menu?.rightClick === false) return;
      e.preventDefault();
      openMenu('column', column.id, e);
    },
    [openMenu, columnShape]
  );

  const handleRowMenu = useCallback(
    (row: Row, e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      openMenu('row', row.id, e);
    },
    [openMenu]
  );

  const handleRowCtx = useCallback(
    (row: Row, e: MouseEvent<HTMLElement>) => {
      if (rowShape?.menu?.rightClick === false) return;
      e.preventDefault();
      openMenu('row', row.id, e);
    },
    [openMenu, rowShape]
  );

  // ─── DnD end handler ─────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: Parameters<typeof dnd.handleDragEnd>[0]) => {
      const resolved = dnd.handleDragEnd(event);
      if (!resolved) return;

      if (resolved.kind === 'column') {
        api.moveColumn(
          resolved.columnId,
          resolved.placement === 'before'
            ? { before: resolved.targetColumnId }
            : { after: resolved.targetColumnId }
        );
        return;
      }

      if (resolved.kind === 'row') {
        api.moveRow(
          resolved.rowId,
          resolved.placement === 'before'
            ? { before: resolved.targetRowId }
            : { after: resolved.targetRowId }
        );
        return;
      }

      // Card move
      const { ids, toColumnId, toRowId, beforeId, afterId } = resolved;

      // Auto-expand collapsed target column / row so the moved card is
      // visible immediately after drop.
      const targetCol = columns.find((c) => c.id === toColumnId);
      if (targetCol?.collapsed) api.expandColumn(toColumnId);
      if (toRowId !== null) {
        const targetRow = rows.find((r) => r.id === toRowId);
        if (targetRow?.collapsed) api.expandRow(toRowId);
      }

      api.moveCard(ids, {
        columnId: toColumnId,
        rowId: toRowId ?? undefined,
        before: beforeId,
        after: afterId,
      });
    },
    [dnd, api, columns, rows]
  );

  // ─── Render ──────────────────────────────────────────────────────────
  const visibleColumns = columns;
  const cardsReadonly = isReadonly(readonly, 'cards', 'add');

  // Anchor for the drag-clone portal so the clone renders inside `.ak-board`
  // and inherits all the `--ak-*` CSS variables (without this, the clone is
  // portaled to <body> and shows up unstyled — no background/border).
  const boardRef = useRef<HTMLDivElement | null>(null);
  const getCloneContainer = useCallback(
    () => boardRef.current ?? document.body,
    []
  );

  // Map for renderClone lookup — translates draggableId (string) back to Card.
  const cardByStringId = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards) m.set(String(c.id), c);
    return m;
  }, [cards]);

  // Renders the drag ghost while a card is being moved. Identical for every
  // Droppable type=CARD because hello-pangea only invokes the source
  // Droppable's renderClone. Provides the multi-select badge.
  const renderCardClone = useCallback(
    (
      provided: import('@hello-pangea/dnd').DraggableProvided,
      _snapshot: import('@hello-pangea/dnd').DraggableStateSnapshot,
      rubric: import('@hello-pangea/dnd').DraggableRubric
    ) => {
      const card = cardByStringId.get(rubric.draggableId);
      const { style: rfdStyle, ...rfdProps } = provided.draggableProps;
      if (!card) {
        return (
          <div
            ref={provided.innerRef}
            {...rfdProps}
            {...provided.dragHandleProps}
            style={rfdStyle as CSSProperties}
          />
        );
      }
      return (
        <div
          ref={provided.innerRef}
          {...rfdProps}
          {...provided.dragHandleProps}
          style={rfdStyle as CSSProperties}
        >
          <KanbanCardOverlay
            card={card}
            cardShape={cardShape}
            multiCount={dnd.draggingIds.length}
          />
        </div>
      );
    },
    [cardByStringId, cardShape, dnd.draggingIds.length]
  );

  return (
    <>
      <div
        ref={boardRef}
        className={['ak-board', className].filter(Boolean).join(' ')}
        data-density={density}
        data-render-type={effectiveProps.renderType ?? 'all'}
        data-scroll-type={effectiveProps.scrollType ?? 'board'}
        data-rtl={false}
        style={themeStyle}
        role="application"
        aria-label="Kanban board"
        onClick={handleBoardClick}
        onKeyDown={handleBoardKeyDown}
      >
        <DragDropContext
          onDragStart={dnd.handleDragStart}
          onDragUpdate={dnd.handleDragUpdate}
          onDragEnd={handleDragEnd}
        >
          {hasSwimlanes ? (
            <SwimlaneLayout
              columns={visibleColumns}
              rows={rows}
              cardsByCell={cardsByCell}
              cardsByColumn={cardsByColumn}
              selection={selection}
              cardShape={effectiveCardShape}
              columnShape={columnShape}
              rowShape={rowShape}
              priorityStyle={priorityStyle}
              columnAccentStyle={columnAccentStyle}
              cardsReadonly={cardsReadonly}
              columnsReadonly={isReadonly(readonly, 'columns', 'move')}
              rowsReadonly={isReadonly(readonly, 'rows', 'move')}
              dropHereLabel={locale.dnd.dropHere}
              gridTemplateColumns={gridTemplateColumns}
              dropInvalid={dnd.invalid}
              draggingIds={dnd.draggingIds}
              activeId={dnd.active?.id}
              renderCardClone={renderCardClone}
              getCloneContainer={getCloneContainer}
              onToggleColumn={handleToggleCollapse}
              onToggleRow={handleToggleRowCollapse}
              onCardClick={handleCardClick}
              onCardDoubleClick={handleCardDoubleClick}
              onAddCard={handleAddCard}
              onCardMenuTrigger={handleCardMenu}
              onCardContextMenu={handleCardCtx}
              onColumnMenuTrigger={handleColumnMenu}
              onColumnContextMenu={handleColumnCtx}
              onRowMenuTrigger={handleRowMenu}
              onRowContextMenu={handleRowCtx}
              onVote={handleVote}
              onAddSubtask={handleAddSubtask}
              onCommentClick={handleCommentClick}
              editingColumnId={editingColumnId}
              editingRowId={editingRowId}
              onColumnTitleStart={handleColumnTitleStart}
              onColumnTitleSubmit={handleColumnTitleSubmit}
              onColumnTitleCancel={handleColumnTitleCancel}
              onRowTitleStart={handleRowTitleStart}
              onRowTitleSubmit={handleRowTitleSubmit}
              onRowTitleCancel={handleRowTitleCancel}
            />
          ) : (
            <FlatLayout
              columns={visibleColumns}
              cardsByColumn={cardsByColumn}
              selection={selection}
              cardShape={effectiveCardShape}
              columnShape={columnShape}
              gridTemplateColumns={gridTemplateColumns}
              priorityStyle={priorityStyle}
              columnAccentStyle={columnAccentStyle}
              cardsReadonly={cardsReadonly}
              columnsReadonly={isReadonly(readonly, 'columns', 'move')}
              dropInvalid={dnd.invalid}
              draggingIds={dnd.draggingIds}
              activeId={dnd.active?.id}
              renderCardClone={renderCardClone}
              getCloneContainer={getCloneContainer}
              onToggleColumn={handleToggleCollapse}
              onCardClick={handleCardClick}
              onCardDoubleClick={handleCardDoubleClick}
              onAddCard={handleAddCard}
              onCardMenuTrigger={handleCardMenu}
              onCardContextMenu={handleCardCtx}
              onColumnMenuTrigger={handleColumnMenu}
              onColumnContextMenu={handleColumnCtx}
              onVote={handleVote}
              onAddSubtask={handleAddSubtask}
              onCommentClick={handleCommentClick}
              editingColumnId={editingColumnId}
              onColumnTitleStart={handleColumnTitleStart}
              onColumnTitleSubmit={handleColumnTitleSubmit}
              onColumnTitleCancel={handleColumnTitleCancel}
            />
          )}
        </DragDropContext>
      </div>

      <KanbanEditor
        card={editorCard}
        isNew={false}
        locale={locale}
        config={editor}
        fields={editorShape}
        currentUser={effectiveProps.currentUser}
        users={editorUsers}
        allCards={cards}
        allLinks={links}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
        onAddComment={(cardId, text) => {
          if (effectiveProps.currentUser === undefined) return;
          api.addComment(cardId, {
            userId: effectiveProps.currentUser,
            text,
          });
        }}
        onUpdateComment={(cardId, commentId, text) =>
          api.updateComment(cardId, commentId, text)
        }
        onDeleteComment={(cardId, commentId) =>
          api.deleteComment(cardId, commentId)
        }
        onAddAttachment={(cardId, attachment) => {
          const card = cards.find((c) => c.id === cardId);
          api.updateCard(cardId, {
            attached: [...(card?.attached ?? []), attachment],
          });
        }}
        onRemoveAttachment={(cardId, attachmentId) => {
          const card = cards.find((c) => c.id === cardId);
          api.updateCard(cardId, {
            attached: (card?.attached ?? []).filter(
              (a) => a.id !== attachmentId
            ),
          });
        }}
        onAddLink={(link) => {
          api.addLink(link);
        }}
        onRemoveLink={(linkId) => {
          api.deleteLink(linkId);
        }}
      />

      <KanbanContextMenu
        open={activeMenu !== null}
        anchor={activeMenu?.anchor ?? null}
        items={activeMenu?.items ?? []}
        onSelect={handleMenuSelect}
        onClose={closeMenu}
      />

      <KanbanConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title}
        message={confirmState?.message ?? ''}
        okLabel={locale.confirm.ok}
        cancelLabel={locale.confirm.cancel}
        destructive={confirmState?.destructive}
        onConfirm={() => {
          confirmState?.onConfirm();
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
      />

      {/* Polite live region — announces board state changes to assistive
          tech without stealing focus. Visually hidden but reachable to AT. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Layouts
// ──────────────────────────────────────────────────────────────────────

interface FlatLayoutProps {
  columns: Column[];
  cardsByColumn: Map<Id, Card[]>;
  selection: Id[];
  cardShape: AwesomeKanbanProps['cardShape'];
  columnShape: AwesomeKanbanProps['columnShape'];
  priorityStyle: NonNullable<AwesomeKanbanProps['priorityStyle']>;
  columnAccentStyle: NonNullable<AwesomeKanbanProps['columnAccentStyle']>;
  cardsReadonly: boolean;
  columnsReadonly: boolean;
  gridTemplateColumns: string;
  dropInvalid: boolean;
  draggingIds: Id[];
  activeId: Id | undefined;
  renderCardClone: (
    provided: import('@hello-pangea/dnd').DraggableProvided,
    snapshot: import('@hello-pangea/dnd').DraggableStateSnapshot,
    rubric: import('@hello-pangea/dnd').DraggableRubric
  ) => JSX.Element;
  getCloneContainer: () => HTMLElement;
  onToggleColumn: (id: Id) => void;
  onCardClick: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardDoubleClick: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onAddCard: (columnId: Id) => void;
  onCardMenuTrigger: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardContextMenu: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onColumnMenuTrigger: (column: Column, e: MouseEvent<HTMLElement>) => void;
  onColumnContextMenu: (column: Column, e: MouseEvent<HTMLElement>) => void;
  onVote?: (cardId: Id) => void;
  onAddSubtask?: (parentId: Id) => void;
  onCommentClick?: (cardId: Id) => void;
  editingColumnId: Id | null;
  onColumnTitleStart: (column: Column) => void;
  onColumnTitleSubmit: (column: Column, label: string) => void;
  onColumnTitleCancel: (column: Column) => void;
}

function FlatLayout({
  columns,
  cardsByColumn,
  selection,
  cardShape,
  columnShape,
  priorityStyle,
  columnAccentStyle,
  cardsReadonly,
  columnsReadonly,
  gridTemplateColumns,
  dropInvalid,
  draggingIds,
  activeId,
  renderCardClone,
  getCloneContainer,
  onToggleColumn,
  onCardClick,
  onCardDoubleClick,
  onAddCard,
  onCardMenuTrigger,
  onCardContextMenu,
  onColumnMenuTrigger,
  onColumnContextMenu,
  onVote,
  onAddSubtask,
  onCommentClick,
  editingColumnId,
  onColumnTitleStart,
  onColumnTitleSubmit,
  onColumnTitleCancel,
}: FlatLayoutProps) {
  return (
    <Droppable
      droppableId="board-columns"
      type="COLUMN"
      direction="horizontal"
      isDropDisabled={columnsReadonly}
    >
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="ak-board__grid"
          style={{ gridTemplateColumns }}
        >
          {columns.map((column, idx) => (
            <Draggable
              key={column.id}
              draggableId={`col-${column.id}`}
              index={idx}
              isDragDisabled={columnsReadonly}
            >
              {(p, snapshot) => (
                <KanbanColumn
                  column={column}
                  cards={cardsByColumn.get(column.id) ?? []}
                  selection={selection}
                  cardShape={cardShape}
                  columnShape={columnShape}
                  priorityStyle={priorityStyle}
                  columnAccentStyle={columnAccentStyle}
                  readonly={cardsReadonly}
                  isDropInvalid={dropInvalid}
                  editingTitle={editingColumnId === column.id}
                  draggableProvided={p}
                  isColumnDragging={snapshot.isDragging}
                  draggingIds={draggingIds}
                  activeId={activeId}
                  renderCardClone={renderCardClone}
                  getCloneContainer={getCloneContainer}
                  onToggleCollapse={onToggleColumn}
                  onCardClick={onCardClick}
                  onCardDoubleClick={onCardDoubleClick}
                  onAddCard={onAddCard}
                  onCardMenuTrigger={onCardMenuTrigger}
                  onCardContextMenu={onCardContextMenu}
                  onColumnMenuTrigger={onColumnMenuTrigger}
                  onColumnContextMenu={onColumnContextMenu}
                  onColumnTitleDoubleClick={onColumnTitleStart}
                  onColumnTitleSubmit={onColumnTitleSubmit}
                  onColumnTitleCancel={onColumnTitleCancel}
                  onVote={onVote}
                  onAddSubtask={onAddSubtask}
                  onCommentClick={onCommentClick}
                />
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

interface SwimlaneLayoutProps {
  columns: Column[];
  rows: Row[];
  cardsByCell: Map<string, Card[]>;
  cardsByColumn: Map<Id, Card[]>;
  selection: Id[];
  cardShape: AwesomeKanbanProps['cardShape'];
  columnShape: AwesomeKanbanProps['columnShape'];
  rowShape: AwesomeKanbanProps['rowShape'];
  priorityStyle: NonNullable<AwesomeKanbanProps['priorityStyle']>;
  columnAccentStyle: NonNullable<AwesomeKanbanProps['columnAccentStyle']>;
  cardsReadonly: boolean;
  columnsReadonly: boolean;
  rowsReadonly: boolean;
  dropHereLabel: string;
  gridTemplateColumns: string;
  dropInvalid: boolean;
  draggingIds: Id[];
  activeId: Id | undefined;
  renderCardClone: (
    provided: import('@hello-pangea/dnd').DraggableProvided,
    snapshot: import('@hello-pangea/dnd').DraggableStateSnapshot,
    rubric: import('@hello-pangea/dnd').DraggableRubric
  ) => JSX.Element;
  getCloneContainer: () => HTMLElement;
  onToggleColumn: (id: Id) => void;
  onToggleRow: (id: Id) => void;
  onCardClick: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardDoubleClick: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onAddCard: (columnId: Id, rowId?: Id) => void;
  onCardMenuTrigger: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardContextMenu: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onColumnMenuTrigger: (column: Column, e: MouseEvent<HTMLElement>) => void;
  onColumnContextMenu: (column: Column, e: MouseEvent<HTMLElement>) => void;
  onRowMenuTrigger: (row: Row, e: MouseEvent<HTMLElement>) => void;
  onRowContextMenu: (row: Row, e: MouseEvent<HTMLElement>) => void;
  onVote?: (cardId: Id) => void;
  onAddSubtask?: (parentId: Id) => void;
  onCommentClick?: (cardId: Id) => void;
  editingColumnId: Id | null;
  editingRowId: Id | null;
  onColumnTitleStart: (column: Column) => void;
  onColumnTitleSubmit: (column: Column, label: string) => void;
  onColumnTitleCancel: (column: Column) => void;
  onRowTitleStart: (row: Row) => void;
  onRowTitleSubmit: (row: Row, label: string) => void;
  onRowTitleCancel: (row: Row) => void;
}

function SwimlaneLayout({
  columns,
  rows,
  cardsByCell,
  cardsByColumn,
  selection,
  cardShape,
  columnShape,
  rowShape,
  priorityStyle,
  columnAccentStyle,
  cardsReadonly,
  columnsReadonly,
  rowsReadonly,
  dropHereLabel,
  gridTemplateColumns,
  dropInvalid,
  draggingIds,
  activeId,
  renderCardClone,
  getCloneContainer,
  onToggleColumn,
  onToggleRow,
  onCardClick,
  onCardDoubleClick,
  onAddCard,
  onCardMenuTrigger,
  onCardContextMenu,
  onColumnMenuTrigger,
  onColumnContextMenu,
  onRowMenuTrigger,
  onRowContextMenu,
  onVote,
  onAddSubtask,
  onCommentClick,
  editingColumnId,
  editingRowId,
  onColumnTitleStart,
  onColumnTitleSubmit,
  onColumnTitleCancel,
  onRowTitleStart,
  onRowTitleSubmit,
  onRowTitleCancel,
}: SwimlaneLayoutProps) {
  return (
    <div
      className="ak-board__grid ak-board__grid--swimlanes"
      style={{ gridTemplateColumns }}
    >
      {/* ── Column headers (Droppable type=COLUMN, horizontal) ─────────── */}
      <Droppable
        droppableId="board-columns"
        type="COLUMN"
        direction="horizontal"
        isDropDisabled={columnsReadonly}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="ak-board__columns-row"
          >
            {columns.map((column, idx) => (
              <Draggable
                key={column.id}
                draggableId={`col-${column.id}`}
                index={idx}
                isDragDisabled={columnsReadonly}
              >
                {(p, snapshot) => (
                  <KanbanColumn
                    column={column}
                    cards={cardsByColumn.get(column.id) ?? []}
                    selection={selection}
                    cardShape={cardShape}
                    columnShape={columnShape}
                    priorityStyle={priorityStyle}
                    columnAccentStyle={columnAccentStyle}
                    readonly={cardsReadonly}
                    editingTitle={editingColumnId === column.id}
                    draggableProvided={p}
                    isColumnDragging={snapshot.isDragging}
                    onToggleCollapse={onToggleColumn}
                    onColumnMenuTrigger={onColumnMenuTrigger}
                    onColumnContextMenu={onColumnContextMenu}
                    onColumnTitleDoubleClick={onColumnTitleStart}
                    onColumnTitleSubmit={onColumnTitleSubmit}
                    onColumnTitleCancel={onColumnTitleCancel}
                    bodyHidden
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* ── Rows (Droppable type=ROW, vertical) ────────────────────────── */}
      <Droppable
        droppableId="board-rows"
        type="ROW"
        direction="vertical"
        isDropDisabled={rowsReadonly}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="ak-board__rows"
          >
            {rows.map((row, rowIdx) => {
              const rowCardsCount = columns.reduce(
                (sum, col) =>
                  sum + (cardsByCell.get(`${col.id}::${row.id}`)?.length ?? 0),
                0
              );
              return (
                <Draggable
                  key={row.id}
                  draggableId={`row-${row.id}`}
                  index={rowIdx}
                  isDragDisabled={rowsReadonly}
                >
                  {(rowProvided, rowSnapshot) => {
                    const { style: rfdRowStyle, ...rfdRowProps } =
                      rowProvided.draggableProps;
                    return (
                      <div
                        ref={rowProvided.innerRef}
                        {...rfdRowProps}
                        className="ak-row"
                        style={(rfdRowStyle as CSSProperties) ?? undefined}
                      >
                        <KanbanRow
                          row={row}
                          cardsCount={rowCardsCount}
                          rowShape={rowShape}
                          editingTitle={editingRowId === row.id}
                          dragHandleProps={
                            rowProvided.dragHandleProps ?? undefined
                          }
                          isRowDragging={rowSnapshot.isDragging}
                          onToggleCollapse={onToggleRow}
                          onMenuTrigger={onRowMenuTrigger}
                          onContextMenu={onRowContextMenu}
                          onTitleDoubleClick={onRowTitleStart}
                          onTitleSubmit={onRowTitleSubmit}
                          onTitleCancel={onRowTitleCancel}
                        />
                        {!row.collapsed &&
                          columns.map((column) => {
                            // Collapsed columns occupy a 40px grid track.
                            // Render the column label rotated 90° here —
                            // DHTMLX-style — so users can still identify
                            // which column the (hidden) cell belongs to.
                            if (column.collapsed) {
                              return (
                                <div
                                  key={`spacer-${column.id}-${row.id}`}
                                  className="ak-cell ak-cell--collapsed"
                                >
                                  <span className="ak-rotated-label">
                                    {column.label}
                                  </span>
                                </div>
                              );
                            }
                            const cellCards =
                              cardsByCell.get(`${column.id}::${row.id}`) ?? [];
                            return (
                              <KanbanCell
                                key={`cell-${column.id}-${row.id}`}
                                column={column}
                                row={row}
                                cards={cellCards}
                                selection={selection}
                                cardShape={cardShape}
                                priorityStyle={priorityStyle}
                                dropHereLabel={dropHereLabel}
                                readonly={cardsReadonly}
                                isDropInvalid={dropInvalid}
                                draggingIds={draggingIds}
                                activeId={activeId}
                                renderCardClone={renderCardClone}
                                getCloneContainer={getCloneContainer}
                                onCardClick={onCardClick}
                                onCardDoubleClick={onCardDoubleClick}
                                onAddCard={onAddCard}
                                onCardMenuTrigger={onCardMenuTrigger}
                                onCardContextMenu={onCardContextMenu}
                                onVote={onVote}
                                onAddSubtask={onAddSubtask}
                                onCommentClick={onCommentClick}
                              />
                            );
                          })}
                      </div>
                    );
                  }}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
