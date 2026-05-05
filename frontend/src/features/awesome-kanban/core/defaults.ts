import type {
  AwesomeKanbanLocale,
  CardMenuItem,
  CardShape,
  ColumnMenuItem,
  ColumnShape,
  PriorityValue,
  RowMenuItem,
  RowShape,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Priority palette (default values)
// ─────────────────────────────────────────────────────────────────────────────

export const defaultPriorityValues: PriorityValue[] = [
  { id: 'high', label: 'Alta', bg: '#fbe0db', fg: '#8e3d2e' },
  { id: 'medium', label: 'Média', bg: '#fae8d4', fg: '#8c5a20' },
  { id: 'low', label: 'Baixa', bg: '#d9ece7', fg: '#2f6e66' },
  { id: 'none', label: 'Sem prioridade', bg: '#eef0f3', fg: '#6b7280' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Column color palette (suggested pastels)
// ─────────────────────────────────────────────────────────────────────────────

export const defaultColumnColors = {
  lavender: '#b8b3d4',
  peach: '#e0b89a',
  violet: '#7c5cff',
  sage: '#6ab796',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Default shapes
// ─────────────────────────────────────────────────────────────────────────────

export const defaultCardShape: CardShape = {
  label: true,
  description: true,
  progress: true,
  start_date: true,
  end_date: true,
  color: false,
  cover: false,
  attached: true,
  comments: true,
  subtaskBadge: true,
  priority: { show: true, values: defaultPriorityValues },
  users: { show: true, values: [], maxCount: 3 },
  votes: { show: false, clickable: true },
  menu: { show: true, rightClick: true },
  confirmDeletion: false,
  showSubtaskLink: false,
};

export const defaultColumnShape: ColumnShape = {
  menu: { show: true, rightClick: true },
  fixedHeaders: true,
  confirmDeletion: false,
  showCardCount: true,
};

export const defaultRowShape: RowShape = {
  menu: { show: true, rightClick: true },
  confirmDeletion: false,
  resizable: false,
  fadeLine: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Default menu items (built-in IDs trigger native behavior)
// ─────────────────────────────────────────────────────────────────────────────

// Soft tints for default icons — same tonal family as the rest of the design
// system (violet primary, sage success, peach neutral, brick destructive).
// Consumers can override per-item via `iconColor`.
const TINT = {
  primary: '#7c5cff',
  sage: '#6ab796',
  amber: '#c98a3d',
  brick: '#b54438',
} as const;

export const defaultCardMenuItems: CardMenuItem[] = [
  { id: '__section_tasks', section: 'TAREFAS', text: '', separator: false },
  {
    id: 'set-edit',
    icon: 'ti-edit',
    iconColor: TINT.primary,
    text: 'Editar',
    shortcut: 'F2',
  },
  {
    id: 'duplicate-card',
    icon: 'ti-copy',
    iconColor: TINT.sage,
    text: 'Duplicar',
    shortcut: 'Ctrl+D',
  },
  { id: '__sep_1', separator: true, text: '' },
  {
    id: 'delete-card',
    icon: 'ti-trash',
    text: 'Eliminar',
    destructive: true,
  },
];

export const defaultColumnMenuItems: ColumnMenuItem[] = [
  { id: '__section_column', section: 'COLUNA', text: '' },
  {
    id: 'add-card',
    icon: 'ti-plus',
    iconColor: TINT.sage,
    text: 'Nova tarefa',
    shortcut: 'N',
  },
  {
    id: 'set-edit',
    icon: 'ti-edit',
    iconColor: TINT.primary,
    text: 'Renomear',
    shortcut: 'F2',
  },
  { id: '__section_move', section: 'MOVER', text: '' },
  {
    id: 'move-left',
    icon: 'ti-arrow-left',
    iconColor: TINT.amber,
    text: 'Mover esquerda',
  },
  {
    id: 'move-right',
    icon: 'ti-arrow-right',
    iconColor: TINT.amber,
    text: 'Mover direita',
  },
  {
    id: 'collapse',
    icon: 'ti-chevrons-left',
    text: 'Recolher / Expandir',
  },
  { id: '__sep_1', separator: true, text: '' },
  {
    id: 'delete-column',
    icon: 'ti-trash',
    text: 'Eliminar',
    destructive: true,
  },
];

export const defaultRowMenuItems: RowMenuItem[] = [
  { id: '__section_swimlane', section: 'SWIMLANE', text: '' },
  {
    id: 'set-edit',
    icon: 'ti-edit',
    iconColor: TINT.primary,
    text: 'Renomear',
    shortcut: 'F2',
  },
  { id: '__section_move', section: 'MOVER', text: '' },
  {
    id: 'move-up',
    icon: 'ti-arrow-up',
    iconColor: TINT.amber,
    text: 'Mover cima',
  },
  {
    id: 'move-down',
    icon: 'ti-arrow-down',
    iconColor: TINT.amber,
    text: 'Mover baixo',
  },
  {
    id: 'collapse',
    icon: 'ti-chevron-up',
    text: 'Recolher / Expandir',
  },
  { id: '__sep_1', separator: true, text: '' },
  {
    id: 'delete-row',
    icon: 'ti-trash',
    text: 'Eliminar',
    destructive: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Built-in menu IDs
// ─────────────────────────────────────────────────────────────────────────────

export const BUILTIN_CARD_IDS = [
  'set-edit',
  'delete-card',
  'duplicate-card',
  'move-up',
  'move-down',
] as const;

export const BUILTIN_COLUMN_IDS = [
  'set-edit',
  'delete-column',
  'move-left',
  'move-right',
  'add-card',
  'collapse',
  'expand',
] as const;

export const BUILTIN_ROW_IDS = [
  'set-edit',
  'delete-row',
  'move-up',
  'move-down',
  'collapse',
  'expand',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Default locale (English)
// ─────────────────────────────────────────────────────────────────────────────

export const defaultLocale: AwesomeKanbanLocale = {
  toolbar: {
    search: 'Search',
    sort: 'Sort',
    addColumn: 'Add column',
    addRow: 'Add row',
    undo: 'Undo',
    redo: 'Redo',
  },
  column: {
    rename: 'Rename',
    delete: 'Delete',
    moveLeft: 'Move left',
    moveRight: 'Move right',
    collapse: 'Collapse',
    expand: 'Expand',
    addCard: 'New task',
  },
  row: {
    rename: 'Rename',
    delete: 'Delete',
    moveUp: 'Move up',
    moveDown: 'Move down',
    collapse: 'Collapse',
    expand: 'Expand',
  },
  card: {
    edit: 'Edit',
    delete: 'Delete',
    duplicate: 'Duplicate',
    subtask: 'SUBTASK',
    addSubtask: '+ Subtask',
  },
  editor: {
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    title: 'Title',
    description: 'Description',
    priority: 'Priority',
    progress: 'Progress',
    startDate: 'Start date',
    endDate: 'End date',
    users: 'Assignees',
  },
  confirm: {
    deleteColumn: 'Delete this column?',
    deleteRow: 'Delete this row?',
    deleteCard: 'Delete this card?',
    ok: 'OK',
    cancel: 'Cancel',
  },
  wip: {
    count: 'cards',
    limitReached: 'WIP limit reached',
  },
  dnd: {
    dropHere: 'DROP HERE',
  },
  menuSections: {
    tasks: 'TASKS',
    column: 'COLUMN',
    swimlane: 'SWIMLANE',
    move: 'MOVE',
  },
};
