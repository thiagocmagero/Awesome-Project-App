import {
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Row, RowShape } from '../types';
import { defaultRowShape } from '../core/defaults';

export interface KanbanRowProps {
  row: Row;
  cardsCount: number;
  rowShape?: RowShape;
  /** When true, the swimlane title is replaced by an inline editable input. */
  editingTitle?: boolean;
  /** Drag-handle props from the parent <Draggable type="ROW">. Applied on the
   *  dot+title region so other controls (collapse, menu) keep their clicks. */
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  /** Whether this row is being dragged (for styling). */
  isRowDragging?: boolean;
  onToggleCollapse?: (id: Row['id']) => void;
  onMenuTrigger?: (row: Row, e: MouseEvent<HTMLElement>) => void;
  onContextMenu?: (row: Row, e: MouseEvent<HTMLElement>) => void;
  onTitleDoubleClick?: (row: Row) => void;
  onTitleSubmit?: (row: Row, label: string) => void;
  onTitleCancel?: (row: Row) => void;
}

/**
 * Swimlane header — renders as a full-width row spanning the grid.
 * Contains the collapse caret, dot, mono uppercase label, fade line and
 * optional menu trigger.
 */
export function KanbanRow({
  row,
  cardsCount,
  rowShape,
  editingTitle = false,
  dragHandleProps,
  isRowDragging = false,
  onToggleCollapse,
  onMenuTrigger,
  onContextMenu,
  onTitleDoubleClick,
  onTitleSubmit,
  onTitleCancel,
}: KanbanRowProps): ReactNode {
  const shape: RowShape = { ...defaultRowShape, ...rowShape };
  const collapsed = !!row.collapsed;

  if (collapsed && shape.collapsedTemplate) {
    return shape.collapsedTemplate({
      row,
      rowState: { cardsCount },
    });
  }
  if (!collapsed && shape.headerTemplate) {
    return shape.headerTemplate({
      row,
      rowState: { cardsCount },
    });
  }

  const showMenu = shape.menu?.show !== false;
  const showFade = shape.fadeLine !== false;

  const style: CSSProperties = {
    ...(row.color
      ? ({ ['--ak-row-color' as string]: row.color } as CSSProperties)
      : {}),
  };

  const classNames = [
    'ak-row-header',
    collapsed && 'ak-row--collapsed',
    isRowDragging && 'ak-row--dragging',
    shape.css?.(row, []),
    row.css,
  ]
    .filter(Boolean)
    .join(' ');

  const handleCollapse = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleCollapse?.(row.id);
  };

  const handleMenu = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    onMenuTrigger?.(row, e);
  };

  const handleContext = (e: MouseEvent<HTMLElement>) => {
    if (shape.menu?.rightClick === false) return;
    e.preventDefault();
    onContextMenu?.(row, e);
  };

  return (
    <div
      className={classNames}
      style={style}
      data-row-id={row.id}
      onContextMenu={handleContext}
    >
      <button
        type="button"
        className="ak-row-header__collapse-btn"
        onClick={handleCollapse}
        aria-label={collapsed ? 'Expand row' : 'Collapse row'}
      >
        <i
          className={collapsed ? 'ti ti-chevron-right' : 'ti ti-chevron-down'}
          aria-hidden="true"
        />
      </button>

      {/* Drag handle: dot + title. Clicks on collapse / menu buttons (outside
          this span) keep their normal behavior. dragHandleProps must always be
          spread (hello-pangea/dnd invariant). The input's own stopPropagation
          calls prevent drag from starting during editing. */}
      <span
        className="ak-row-header__drag-handle"
        {...(dragHandleProps ?? {})}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: editingTitle ? 'text' : dragHandleProps ? 'grab' : 'default',
        }}
      >
        <span className="ak-row-header__dot" aria-hidden="true" />
        {editingTitle ? (
          <RowTitleInput
            row={row}
            onSubmit={onTitleSubmit}
            onCancel={onTitleCancel}
          />
        ) : (
          <span
            className="ak-row-header__title"
            onDoubleClick={() => onTitleDoubleClick?.(row)}
          >
            {row.label}
          </span>
        )}
      </span>

      {showFade && <span className="ak-row-header__fade" aria-hidden="true" />}

      {showMenu && (
        <button
          type="button"
          className="ak-row-header__menu-btn"
          aria-label="Open row menu"
          data-menu-id={row.id}
          onClick={handleMenu}
        >
          <i className="ti ti-dots" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface RowTitleInputProps {
  row: Row;
  onSubmit?: (row: Row, label: string) => void;
  onCancel?: (row: Row) => void;
}

function RowTitleInput({ row, onSubmit, onCancel }: RowTitleInputProps) {
  const [value, setValue] = useState(row.label);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    // rAF ensures focus lands after FloatingFocusManager restores focus to the
    // menu trigger (same fix as ColumnTitleInput — avoids immediate onBlur cycle).
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
    if (!next || next === row.label) {
      onCancel?.(row);
    } else {
      onSubmit?.(row, next);
    }
  };

  const cancel = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onCancel?.(row);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else {
      e.stopPropagation();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="ak-row-header__title-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Swimlane name"
    />
  );
}
