import {
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Column, ColumnShape } from '../types';
import { defaultColumnShape } from '../core/defaults';

export interface KanbanColumnHeaderProps {
  column: Column;
  cardsCount: number;
  isOverLimit: boolean;
  collapsed: boolean;
  columnShape?: ColumnShape;
  /** When true, replace the title span with an inline editable input. */
  editing?: boolean;
  onToggleCollapse?: (id: Column['id']) => void;
  onMenuTrigger?: (column: Column, e: MouseEvent<HTMLElement>) => void;
  onContextMenu?: (column: Column, e: MouseEvent<HTMLElement>) => void;
  onTitleDoubleClick?: (column: Column) => void;
  /** Submit a new label — fired on Enter or blur with a non-empty value. */
  onTitleSubmit?: (column: Column, label: string) => void;
  /** Cancel inline editing — fired on Esc or blur with an empty / unchanged
   *  value. The component should leave the title untouched. */
  onTitleCancel?: (column: Column) => void;
  /** Drag-handle props from `useSortable` — applied to the title region so
   *  dragging the title moves the column without interfering with the
   *  collapse button or the menu trigger. */
  dragHandleProps?: HTMLAttributes<HTMLElement>;
}

export function KanbanColumnHeader({
  column,
  cardsCount,
  isOverLimit,
  collapsed,
  columnShape,
  editing = false,
  onToggleCollapse,
  onMenuTrigger,
  onContextMenu,
  onTitleDoubleClick,
  onTitleSubmit,
  onTitleCancel,
  dragHandleProps,
}: KanbanColumnHeaderProps) {
  const shape: ColumnShape = { ...defaultColumnShape, ...columnShape };

  // Custom template paths — collapsedTemplate wins when collapsed
  if (collapsed && shape.collapsedTemplate) {
    return shape.collapsedTemplate({
      column,
      columnState: { cardsCount, isOverLimit },
    }) as ReactNode;
  }
  if (!collapsed && shape.headerTemplate) {
    return shape.headerTemplate({
      column,
      columnState: { cardsCount, isOverLimit },
    }) as ReactNode;
  }

  const showCount = shape.showCardCount !== false;
  const showMenu = shape.menu?.show !== false;

  const limit =
    typeof column.limit === 'number' ? column.limit : undefined;
  const counter = limit !== undefined ? `${cardsCount}/${limit}` : `${cardsCount}`;

  const handleCollapse = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse?.(column.id);
  };

  const handleMenu = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    onMenuTrigger?.(column, e);
  };

  const handleContext = (e: MouseEvent<HTMLElement>) => {
    if (shape.menu?.rightClick === false) return;
    e.preventDefault();
    onContextMenu?.(column, e);
  };

  return (
    <div className="ak-column__header" onContextMenu={handleContext}>
      <button
        type="button"
        className="ak-column__collapse-btn"
        onClick={handleCollapse}
        aria-label={collapsed ? 'Expand column' : 'Collapse column'}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <i
          className={collapsed ? 'ti ti-chevron-right' : 'ti ti-chevron-left'}
          aria-hidden="true"
        />
      </button>

      {/* Drag handle area — dot + title together. The collapse button (left)
          and the count pill / menu button (right) sit outside this region so
          their clicks aren't captured by the drag listeners. dragHandleProps
          must always be spread (hello-pangea/dnd invariant: the handle element
          must remain in the DOM while the Draggable is mounted). The input's
          own stopPropagation calls prevent drag from starting during editing. */}
      <span
        className="ak-column__drag-handle"
        {...dragHandleProps}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          flex: '1 1 auto',
          minWidth: 0,
          cursor: editing ? 'text' : dragHandleProps ? 'grab' : 'default',
        }}
      >
        <span className="ak-column__dot" aria-hidden="true" />
        {editing ? (
          <ColumnTitleInput
            column={column}
            onSubmit={onTitleSubmit}
            onCancel={onTitleCancel}
          />
        ) : (
          <span
            className="ak-column__title"
            onDoubleClick={() => onTitleDoubleClick?.(column)}
          >
            {column.label}
          </span>
        )}
      </span>

      {showCount && (
        <span
          className={
            'ak-column__count' +
            (isOverLimit ? ' ak-column__count--over-limit' : '')
          }
        >
          {counter}
        </span>
      )}

      {showMenu && (
        <button
          type="button"
          className="ak-column__menu-btn"
          aria-label="Open column menu"
          data-menu-id={column.id}
          onClick={handleMenu}
        >
          <i className="ti ti-dots" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface ColumnTitleInputProps {
  column: Column;
  onSubmit?: (column: Column, label: string) => void;
  onCancel?: (column: Column) => void;
}

function ColumnTitleInput({
  column,
  onSubmit,
  onCancel,
}: ColumnTitleInputProps) {
  const [value, setValue] = useState(column.label);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    // rAF ensures focus lands after FloatingFocusManager restores focus to the
    // menu trigger (which otherwise steals focus back, triggering an immediate
    // onBlur → commit → cancel cycle that makes rename appear to do nothing).
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const commit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const next = value.trim();
    if (!next || next === column.label) {
      onCancel?.(column);
    } else {
      onSubmit?.(column, next);
    }
  };

  const cancel = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onCancel?.(column);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else {
      // Stop propagation for typing/navigation keys so the board's keyboard
      // handler doesn't intercept (e.g., Delete to remove the focused card).
      e.stopPropagation();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="ak-column__title-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Column name"
    />
  );
}
