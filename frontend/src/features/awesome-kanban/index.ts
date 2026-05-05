// Side-effect: bundle the CSS so consumers can either rely on this entry
// or do `import 'awesome-kanban/styles.css'` explicitly.
import './styles/awesome-kanban.css';

// ─── Components ─────────────────────────────────────────────────────────────
export { AwesomeKanban } from './AwesomeKanban';
export { AwesomeKanbanToolbar } from './AwesomeKanbanToolbar';
export { KanbanCard } from './components/KanbanCard';
export { KanbanColumn } from './components/KanbanColumn';
export { KanbanColumnHeader } from './components/KanbanColumnHeader';
export { KanbanColumnCollapsed } from './components/KanbanColumnCollapsed';
export { KanbanRow } from './components/KanbanRow';
export { KanbanCell } from './components/KanbanCell';
export { KanbanDropZone } from './components/KanbanDropZone';
export { KanbanCardOverlay } from './components/KanbanCardOverlay';
export { KanbanContextMenu } from './components/KanbanContextMenu';
export { KanbanConfirmDialog } from './components/KanbanConfirmDialog';
export { KanbanEditor } from './components/editor/KanbanEditor';
export { EditorPopup } from './components/editor/EditorPopup';
export { EditorModal } from './components/editor/EditorModal';
export { EditorSidebar } from './components/editor/EditorSidebar';

// ─── Editor fields ──────────────────────────────────────────────────────────
export { TextField as EditorTextField } from './components/editor/fields/TextField';
export { SelectField as EditorSelectField } from './components/editor/fields/SelectField';
export { DateField as EditorDateField } from './components/editor/fields/DateField';
export { ProgressField as EditorProgressField } from './components/editor/fields/ProgressField';

// ─── Hooks ──────────────────────────────────────────────────────────────────
export { useKanbanState } from './hooks/useKanbanState';
export { useKanbanSelection } from './hooks/useKanbanSelection';
export { useKanbanHistory } from './hooks/useKanbanHistory';
export { useKanbanDnd } from './hooks/useKanbanDnd';
export { useKanbanSearch } from './hooks/useKanbanSearch';
export { useContextMenu } from './hooks/useContextMenu';

// ─── Defaults ───────────────────────────────────────────────────────────────
export {
  defaultLocale,
  defaultCardShape,
  defaultColumnShape,
  defaultRowShape,
  defaultPriorityValues,
  defaultColumnColors,
  defaultCardMenuItems,
  defaultColumnMenuItems,
  defaultRowMenuItems,
  BUILTIN_CARD_IDS,
  BUILTIN_COLUMN_IDS,
  BUILTIN_ROW_IDS,
} from './core/defaults';

// ─── Color helpers ──────────────────────────────────────────────────────────
export {
  AVATAR_PALETTE,
  getAvatarColor,
  initials,
  mix,
  fade,
  softVariant,
  activeVariant,
  tintedBackground,
} from './core/colors';

// ─── Ordering / reducer helpers (for controlled-mode handlers) ──────────────
export {
  applyCardMove,
  applyColumnReorder,
  applyRowReorder,
  generateId,
  insertAt,
  moveById,
  removeById,
  updateById,
} from './core/ordering';

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  // Core
  Id,
  Column,
  Row,
  Card,
  Link,
  Attachment,
  Comment,
  // Shapes
  CardShape,
  ColumnShape,
  RowShape,
  CardTemplateCtx,
  ColumnHeaderCtx,
  RowHeaderCtx,
  PriorityValue,
  UserValue,
  // Menu
  MenuItem,
  CardMenuItem,
  ColumnMenuItem,
  RowMenuItem,
  CardMenuCtx,
  ColumnMenuCtx,
  RowMenuCtx,
  // Editor
  EditorField,
  EditorFieldType,
  EditorFieldCtx,
  EditorConfig,
  EditorRenderContext,
  // Toolbar
  ToolbarItem,
  SearchOption,
  SortOption,
  // Locale & state
  AwesomeKanbanLocale,
  AwesomeKanbanState,
  AwesomeKanbanProps,
  AwesomeKanbanApi,
  AwesomeKanbanEventMap,
  ReadonlyConfig,
  // Events
  CardAddEvent,
  CardUpdateEvent,
  CardDeleteEvent,
  CardMoveEvent,
  CardDuplicateEvent,
  CardClickEvent,
  ColumnAddEvent,
  ColumnUpdateEvent,
  ColumnDeleteEvent,
  ColumnMoveEvent,
  RowAddEvent,
  RowUpdateEvent,
  RowDeleteEvent,
  RowMoveEvent,
  LinkAddEvent,
  LinkDeleteEvent,
  CommentEvent,
  DragStartEvent,
  DragEvent,
  DragOverEvent,
  DragEndEvent,
} from './types';
