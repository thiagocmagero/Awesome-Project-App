import type { ReactNode, MutableRefObject } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────────

export type Id = string | number;

// ─────────────────────────────────────────────────────────────────────────────
// Domain entities
// ─────────────────────────────────────────────────────────────────────────────

export interface Column {
  id: Id;
  label: string;
  collapsed?: boolean;
  limit?: number | Record<Id, number>;
  strictLimit?: boolean;
  css?: string;
  color?: string;
  overlay?: ReactNode;
  allowDropFrom?: Id[];
  allowDropTo?: Id[];
  width?: number;
  readonly?: boolean;
  data?: Record<string, unknown>;
}

export interface Row {
  id: Id;
  label: string;
  collapsed?: boolean;
  height?: number;
  css?: string;
  color?: string;
  readonly?: boolean;
  data?: Record<string, unknown>;
}

export interface Attachment {
  id: Id;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface Comment {
  id: Id;
  userId: Id;
  text: string;
  date: Date | string;
  edited?: boolean;
}

export interface Card {
  id: Id;
  label: string;
  description?: string;
  columnId: Id;
  rowId?: Id;

  priority?: Id;
  color?: string;
  progress?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  attached?: Attachment[];
  comments?: Comment[];
  votes?: number;
  votedBy?: Id[];
  users?: Id[];
  subtaskOf?: Id;

  [customKey: string]: unknown;
}

export interface Link {
  id: Id;
  masterId: Id;
  slaveId: Id;
  relation: 'relatesTo' | 'requiredFor' | 'duplicate' | 'parent' | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shape configurations
// ─────────────────────────────────────────────────────────────────────────────

export interface PriorityValue {
  id: Id;
  label: string;
  bg: string;
  fg: string;
}

export interface UserValue {
  id: Id;
  label?: string;
  avatar?: string;
  color?: string;
}

export interface CardMenuCtx {
  card: Card;
  readonly: boolean;
  selected: Id[];
}

export interface ColumnMenuCtx {
  column: Column;
  columnIndex: number;
  columns: Column[];
  readonly: boolean;
}

export interface RowMenuCtx {
  row: Row;
  rowIndex: number;
  rows: Row[];
  readonly: boolean;
}

export interface MenuItem<TCtx = unknown> {
  id: string;
  text?: string;
  icon?: string | ReactNode;
  /** Per-item icon color — e.g. red for "Delete PDF", violet for "Export Image". */
  iconColor?: string;
  disabled?: boolean;
  separator?: boolean;
  destructive?: boolean;
  shortcut?: string;
  section?: string;
  onClick?: (ctx: TCtx) => void;
  data?: MenuItem<TCtx>[];
}

export type CardMenuItem = MenuItem<{
  id: string;
  item: CardMenuItem;
  card: Card;
}>;

export type ColumnMenuItem = MenuItem<{
  id: string;
  item: ColumnMenuItem;
  column: Column;
}>;

export type RowMenuItem = MenuItem<{
  id: string;
  item: RowMenuItem;
  row: Row;
}>;

export interface CardTemplateCtx {
  cardFields: Card;
  selected: boolean;
  dragging: boolean;
  cardShape: CardShape;
}

export interface CardShape {
  label?: boolean | { show?: boolean };
  description?: boolean | { show?: boolean };
  progress?: boolean | { show?: boolean };
  start_date?: boolean | { show?: boolean };
  end_date?: boolean | { show?: boolean };
  color?: boolean | { show?: boolean; values?: string[] };
  cover?: boolean | { show?: boolean };
  attached?: boolean | { show?: boolean };
  comments?: boolean | { show?: boolean };
  subtaskBadge?: boolean;

  priority?:
    | boolean
    | {
        show?: boolean;
        values?: PriorityValue[];
      };

  users?:
    | boolean
    | {
        show?: boolean;
        values: UserValue[];
        maxCount?: number | false;
      };

  votes?: boolean | { show?: boolean; clickable?: boolean };

  menu?:
    | boolean
    | {
        show?: boolean;
        items?: CardMenuItem[] | ((ctx: CardMenuCtx) => CardMenuItem[] | null | false);
        rightClick?: boolean;
      };

  confirmDeletion?: boolean;
  headerFields?: Array<{ key: string; label?: string; css?: string }>;
  css?: (card: Card) => string | undefined;
  template?: (ctx: CardTemplateCtx) => ReactNode;
  showSubtaskLink?: boolean;
}

export interface ColumnHeaderCtx {
  column: Column;
  columnState: { cardsCount: number; isOverLimit: boolean };
}

export interface ColumnShape {
  menu?: {
    show?: boolean;
    items?: ColumnMenuItem[] | ((ctx: ColumnMenuCtx) => ColumnMenuItem[] | null | false);
    rightClick?: boolean;
  };
  fixedHeaders?: boolean;
  css?: (column: Column, cards: Card[]) => string | undefined;
  headerTemplate?: (ctx: ColumnHeaderCtx) => ReactNode;
  collapsedTemplate?: (ctx: ColumnHeaderCtx) => ReactNode;
  confirmDeletion?: boolean;
  showCardCount?: boolean;
}

export interface RowHeaderCtx {
  row: Row;
  rowState: { cardsCount: number };
}

export interface RowShape {
  menu?: {
    show?: boolean;
    items?: RowMenuItem[] | ((ctx: RowMenuCtx) => RowMenuItem[] | null | false);
    rightClick?: boolean;
  };
  css?: (row: Row, cards: Card[]) => string | undefined;
  headerTemplate?: (ctx: RowHeaderCtx) => ReactNode;
  collapsedTemplate?: (ctx: RowHeaderCtx) => ReactNode;
  confirmDeletion?: boolean;
  resizable?: boolean;
  fadeLine?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor
// ─────────────────────────────────────────────────────────────────────────────

export type EditorFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'combo'
  | 'date'
  | 'dateRange'
  | 'progress'
  | 'color'
  | 'files'
  | 'links'
  | 'comments'
  | 'custom';

export interface EditorFieldCtx {
  card: Card;
  value: unknown;
  setValue: (value: unknown) => void;
}

export interface EditorField {
  type: EditorFieldType;
  key: string;
  label: string;
  values?: Array<{ id: Id; label: string; [k: string]: unknown }>;
  config?: Record<string, unknown>;
  uploadURL?: string | ((rec: { id: Id; file: File }) => Promise<unknown>);
  render?: (ctx: EditorFieldCtx) => ReactNode;
  validate?: (value: unknown, card: Card) => string | null;
}

export interface EditorRenderContext {
  card: Card | null;
  isOpen: boolean;
  isNew: boolean;
  close: () => void;
  save: () => void;
  update: (patch: Partial<Card>) => void;
  cancel: () => void;
}

export interface EditorConfig {
  placement?: 'popup' | 'modal' | 'sidebar';
  width?: number | string;
  height?: number | string;
  autoSave?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  draggable?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchOption {
  key: string;
  label: string;
}

export interface SortOption {
  id: string;
  label: string;
  by: string;
  direction?: 'asc' | 'desc';
}

export type ToolbarItem =
  | 'search'
  | 'spacer'
  | 'undo'
  | 'redo'
  | 'sort'
  | 'addColumn'
  | 'addRow'
  | {
      type: 'search';
      options?: SearchOption[];
      resultTemplate?: (r: Card) => ReactNode;
      placeholder?: string;
    }
  | { type: 'sort'; options: SortOption[] }
  | { type: 'custom'; render: () => ReactNode };

// ─────────────────────────────────────────────────────────────────────────────
// Readonly config
// ─────────────────────────────────────────────────────────────────────────────

export interface ReadonlyConfig {
  cards?: { add?: boolean; edit?: boolean; delete?: boolean; move?: boolean };
  columns?: { add?: boolean; edit?: boolean; delete?: boolean; move?: boolean };
  rows?: { add?: boolean; edit?: boolean; delete?: boolean; move?: boolean };
}

// ─────────────────────────────────────────────────────────────────────────────
// Locale
// ─────────────────────────────────────────────────────────────────────────────

export interface AwesomeKanbanLocale {
  toolbar: {
    search: string;
    sort: string;
    addColumn: string;
    addRow: string;
    undo: string;
    redo: string;
  };
  column: {
    rename: string;
    delete: string;
    moveLeft: string;
    moveRight: string;
    collapse: string;
    expand: string;
    addCard: string;
  };
  row: {
    rename: string;
    delete: string;
    moveUp: string;
    moveDown: string;
    collapse: string;
    expand: string;
  };
  card: {
    edit: string;
    delete: string;
    duplicate: string;
    subtask: string;
    addSubtask: string;
  };
  editor: {
    save: string;
    cancel: string;
    close: string;
    title: string;
    description: string;
    priority: string;
    progress: string;
    startDate: string;
    endDate: string;
    users: string;
  };
  confirm: {
    deleteColumn: string;
    deleteRow: string;
    deleteCard: string;
    ok: string;
    cancel: string;
  };
  wip: {
    count: string;
    limitReached: string;
  };
  dnd: {
    dropHere: string;
  };
  menuSections: {
    tasks: string;
    column: string;
    swimlane: string;
    move: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────────────────────

export interface CardAddEvent {
  card: Card;
}
export interface CardUpdateEvent {
  id: Id;
  patch: Partial<Card>;
}
export interface CardDeleteEvent {
  id: Id | Id[];
  cards: Card[];
}
export interface CardMoveEvent {
  id: Id;
  source: Id[];
  fromColumnId: Id;
  fromRowId: Id | null;
  toColumnId: Id;
  toRowId: Id | null;
  before?: Id;
  after?: Id;
}
export interface CardDuplicateEvent {
  ids: Id[];
  newIds: Id[];
}
export interface CardClickEvent {
  card: Card;
  event: React.MouseEvent;
}

export interface ColumnAddEvent {
  column: Column;
}
export interface ColumnUpdateEvent {
  id: Id;
  patch: Partial<Column>;
}
export interface ColumnDeleteEvent {
  id: Id;
  cards: Card[];
}
export interface ColumnMoveEvent {
  id: Id;
  before?: Id;
  after?: Id;
}

export interface RowAddEvent {
  row: Row;
}
export interface RowUpdateEvent {
  id: Id;
  patch: Partial<Row>;
}
export interface RowDeleteEvent {
  id: Id;
  cards: Card[];
}
export interface RowMoveEvent {
  id: Id;
  before?: Id;
  after?: Id;
}

export interface LinkAddEvent {
  link: Link;
}
export interface LinkDeleteEvent {
  id: Id;
}

export interface CommentEvent {
  cardId: Id;
  comment: Comment;
}

export interface DragStartEvent {
  type: 'card' | 'column' | 'row';
  id: Id;
}
export interface DragEvent {
  type: 'card' | 'column' | 'row';
  id: Id;
  position: { x: number; y: number };
}
export interface DragOverEvent {
  type: 'card' | 'column' | 'row';
  id: Id;
  overId: Id | null;
}
export interface DragEndEvent {
  type: 'card' | 'column' | 'row';
  id: Id;
}

export interface AwesomeKanbanEventMap {
  'card:add': CardAddEvent;
  'card:update': CardUpdateEvent;
  'card:delete': CardDeleteEvent;
  'card:move': CardMoveEvent;
  'card:duplicate': CardDuplicateEvent;
  'card:click': CardClickEvent;
  'card:doubleclick': CardClickEvent;
  'card:selection': { selectedIds: Id[] };
  'column:add': ColumnAddEvent;
  'column:update': ColumnUpdateEvent;
  'column:delete': ColumnDeleteEvent;
  'column:move': ColumnMoveEvent;
  'column:collapse': { id: Id; collapsed: boolean };
  'row:add': RowAddEvent;
  'row:update': RowUpdateEvent;
  'row:delete': RowDeleteEvent;
  'row:move': RowMoveEvent;
  'row:collapse': { id: Id; collapsed: boolean };
  'link:add': LinkAddEvent;
  'link:delete': LinkDeleteEvent;
  'comment:add': CommentEvent;
  'comment:update': CommentEvent;
  'comment:delete': CommentEvent;
  'vote': { cardId: Id; userId: Id; voted: boolean };
  'drag:start': DragStartEvent;
  'drag:move': DragEvent;
  'drag:over': DragOverEvent;
  'drag:end': DragEndEvent;
}

// ─────────────────────────────────────────────────────────────────────────────
// State (snapshot)
// ─────────────────────────────────────────────────────────────────────────────

export interface AwesomeKanbanState {
  columns: Column[];
  rows: Row[];
  cards: Card[];
  links: Link[];
  selection: Id[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Imperative API
// ─────────────────────────────────────────────────────────────────────────────

export interface AwesomeKanbanApi {
  // Cards
  addCard(
    card: Partial<Card> & { columnId: Id; rowId?: Id },
    options?: { before?: Id; after?: Id }
  ): Id;
  updateCard(id: Id, patch: Partial<Card>): void;
  deleteCard(id: Id | Id[]): void;
  duplicateCard(id: Id | Id[]): Id[];
  moveCard(
    id: Id | Id[],
    target: { columnId: Id; rowId?: Id; before?: Id; after?: Id }
  ): void;
  selectCard(id: Id | Id[], options?: { append?: boolean }): void;
  getSelection(): Id[];
  clearSelection(): void;

  // Columns
  addColumn(args: {
    id?: Id;
    column: Partial<Column>;
    before?: Id;
    after?: Id;
  }): Id;
  updateColumn(id: Id, patch: Partial<Column>): void;
  deleteColumn(id: Id, options?: { reassignTo?: Id }): void;
  moveColumn(id: Id, target: { before?: Id; after?: Id }): void;
  collapseColumn(id: Id): void;
  expandColumn(id: Id): void;
  toggleColumn(id: Id): void;

  // Rows
  addRow(args: { id?: Id; row: Partial<Row>; before?: Id; after?: Id }): Id;
  updateRow(id: Id, patch: Partial<Row>): void;
  deleteRow(id: Id, options?: { reassignTo?: Id }): void;
  moveRow(id: Id, target: { before?: Id; after?: Id }): void;
  collapseRow(id: Id): void;
  expandRow(id: Id): void;
  toggleRow(id: Id): void;

  // Links
  addLink(link: Omit<Link, 'id'> & { id?: Id }): Id;
  deleteLink(id: Id): void;

  // Comments
  addComment(
    cardId: Id,
    comment: Omit<Comment, 'id' | 'date'> & { id?: Id; date?: Date }
  ): Id;
  updateComment(cardId: Id, commentId: Id, text: string): void;
  deleteComment(cardId: Id, commentId: Id): void;

  // Editor
  openEditor(cardId: Id | null): void;
  closeEditor(): void;

  // Search / data
  search(query: string, fields?: string[]): Card[];
  parse(data: {
    columns?: Column[];
    rows?: Row[];
    cards?: Card[];
    links?: Link[];
  }): void;
  serialize(): {
    columns: Column[];
    rows: Row[];
    cards: Card[];
    links: Link[];
  };

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;

  // Runtime config
  setConfig(patch: Partial<AwesomeKanbanProps>): void;
  setDensity(density: 'compact' | 'normal' | 'wide'): void;
  setPrimaryColor(color: string): void;
  setLocale(locale: AwesomeKanbanLocale): void;

  // Event bus
  on<K extends keyof AwesomeKanbanEventMap>(
    event: K,
    handler: (e: AwesomeKanbanEventMap[K]) => void | boolean | Promise<void>
  ): () => void;
  off<K extends keyof AwesomeKanbanEventMap>(
    event: K,
    handler: (e: AwesomeKanbanEventMap[K]) => void | boolean | Promise<void>
  ): void;
  emit<K extends keyof AwesomeKanbanEventMap>(
    event: K,
    payload: AwesomeKanbanEventMap[K]
  ): void;
  intercept<K extends keyof AwesomeKanbanEventMap>(
    event: K,
    handler: (e: AwesomeKanbanEventMap[K]) => boolean
  ): () => void;

  // Export
  exportToJSON(): string;
  exportToCSV(): string;

  // State
  getState(): AwesomeKanbanState;
  getReactiveState(): AwesomeKanbanState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component props
// ─────────────────────────────────────────────────────────────────────────────

export interface AwesomeKanbanProps {
  // Data — controlled
  columns?: Column[];
  rows?: Row[];
  cards?: Card[];
  links?: Link[];

  // Data — uncontrolled
  defaultColumns?: Column[];
  defaultRows?: Row[];
  defaultCards?: Card[];
  defaultLinks?: Link[];

  rowKey?: string;

  // Appearance / shape
  cardShape?: CardShape;
  columnShape?: ColumnShape;
  rowShape?: RowShape;
  editorShape?: EditorField[];
  className?: string;

  // Theme
  density?: 'compact' | 'normal' | 'wide';
  primaryColor?: string;
  columnAccentStyle?: 'cap' | 'bar' | 'dot' | 'soft';
  priorityStyle?: 'pill' | 'dot' | 'stripe';

  // Behavior
  readonly?: boolean | ReadonlyConfig;
  renderType?: 'all' | 'lazy';
  scrollType?: 'board' | 'column';
  history?: boolean | { undoLimit?: number };

  // Editor
  editor?:
    | EditorConfig
    | ((ctx: EditorRenderContext) => ReactNode)
    | null
    | false;

  // Drag & Drop
  dragMode?: 'card' | 'column' | 'row' | 'all' | 'none';
  multiselect?: boolean;

  // Localization
  locale?: AwesomeKanbanLocale;

  // Identity
  currentUser?: Id;

  // Toolbar / search
  /** Active search query — non-matching cards are dimmed (filter is by `label`
   *  + `description` case-insensitive, configurable via `searchFields`). */
  searchQuery?: string;
  searchFields?: string[];

  // Card events
  onCardAdd?: (e: CardAddEvent) => void | boolean;
  onCardUpdate?: (e: CardUpdateEvent) => void | boolean;
  onCardDelete?: (e: CardDeleteEvent) => void | boolean;
  onCardMove?: (e: CardMoveEvent) => void | boolean;
  onCardDuplicate?: (e: CardDuplicateEvent) => void | boolean;
  onCardClick?: (e: CardClickEvent) => void | boolean;
  onCardDoubleClick?: (e: CardClickEvent) => void | boolean;
  onCardSelectionChange?: (selectedIds: Id[]) => void;

  // Column events
  onColumnAdd?: (e: ColumnAddEvent) => void | boolean;
  onColumnUpdate?: (e: ColumnUpdateEvent) => void | boolean;
  onColumnDelete?: (e: ColumnDeleteEvent) => void | boolean;
  onColumnMove?: (e: ColumnMoveEvent) => void | boolean;
  onColumnCollapse?: (e: { id: Id; collapsed: boolean }) => void | boolean;

  // Row events
  onRowAdd?: (e: RowAddEvent) => void | boolean;
  onRowUpdate?: (e: RowUpdateEvent) => void | boolean;
  onRowDelete?: (e: RowDeleteEvent) => void | boolean;
  onRowMove?: (e: RowMoveEvent) => void | boolean;
  onRowCollapse?: (e: { id: Id; collapsed: boolean }) => void | boolean;

  // Link / comment / vote
  onLinkAdd?: (e: LinkAddEvent) => void | boolean;
  onLinkDelete?: (e: LinkDeleteEvent) => void | boolean;
  onCommentAdd?: (e: CommentEvent) => void | boolean;
  onCommentUpdate?: (e: CommentEvent) => void | boolean;
  onCommentDelete?: (e: CommentEvent) => void | boolean;
  onVote?: (e: {
    cardId: Id;
    userId: Id;
    voted: boolean;
  }) => void | boolean;

  /** Fired when the "+ Subtarefa" inline button is clicked on a card.
   *  `cardId` is the parent card's id; `columnId` is its current column. */
  onAddSubtask?: (e: { cardId: Id; columnId?: Id }) => void;

  /** Fired when the comment count badge is clicked on a card.
   *  Typically used to open the task modal on the comments tab. */
  onCommentClick?: (e: { cardId: Id }) => void;

  /** Overrides the default "add card" button (column "+" button and swimlane
   *  cell "+" button) behavior. When provided, clicking the button calls this
   *  callback instead of running the built-in inline-card-create flow. */
  onAddCard?: (columnId: Id, rowId?: Id) => void;

  // Drag phases
  onDragStart?: (e: DragStartEvent) => void | boolean;
  onDrag?: (e: DragEvent) => void;
  onDragOver?: (e: DragOverEvent) => void | boolean;
  onDragEnd?: (e: DragEndEvent) => void;

  // Generic change
  onChange?: (state: AwesomeKanbanState) => void;

  // Imperative ref
  apiRef?: MutableRefObject<AwesomeKanbanApi | null>;
}
