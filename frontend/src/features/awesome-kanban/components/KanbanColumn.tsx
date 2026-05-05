import { type CSSProperties, type ReactNode, useMemo, type MouseEvent } from 'react';
import {
  Draggable,
  Droppable,
  type DraggableProvided,
  type DraggableRubric,
  type DraggableStateSnapshot,
} from '@hello-pangea/dnd';
import type {
  Card,
  CardShape,
  Column,
  ColumnShape,
  Id,
} from '../types';
import { KanbanColumnHeader } from './KanbanColumnHeader';
import { KanbanCard } from './KanbanCard';

export interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  selection: Id[];
  cardShape?: CardShape;
  columnShape?: ColumnShape;
  priorityStyle?: 'pill' | 'dot' | 'stripe';
  columnAccentStyle?: 'cap' | 'bar' | 'dot' | 'soft';
  readonly?: boolean;
  /** Active drop target invalid marker (red highlight). Forwarded to inner cells. */
  isDropInvalid?: boolean;
  /** When true, the column header shows an inline rename input. */
  editingTitle?: boolean;
  /** DnD wiring from <Draggable type="COLUMN"> in the parent. */
  draggableProvided?: DraggableProvided;
  /** Whether this column is being dragged (snapshot.isDragging). */
  isColumnDragging?: boolean;
  /** Forwarded from parent for hidden members of a multi-card drag. */
  draggingIds?: Id[];
  activeId?: Id;
  /** Custom drag ghost renderer for cards (badge with multi-select count). */
  renderCardClone?: (
    provided: DraggableProvided,
    snapshot: DraggableStateSnapshot,
    rubric: DraggableRubric
  ) => JSX.Element;
  /** Anchor for the renderClone portal so it inherits `.ak-board` CSS vars. */
  getCloneContainer?: () => HTMLElement;
  onToggleCollapse?: (id: Id) => void;
  onColumnMenuTrigger?: (column: Column, e: MouseEvent<HTMLElement>) => void;
  onColumnContextMenu?: (column: Column, e: MouseEvent<HTMLElement>) => void;
  onColumnTitleDoubleClick?: (column: Column) => void;
  onColumnTitleSubmit?: (column: Column, label: string) => void;
  onColumnTitleCancel?: (column: Column) => void;
  onCardClick?: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardDoubleClick?: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardMenuTrigger?: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardContextMenu?: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onAddCard?: (columnId: Id) => void;
  onAddSubtask?: (parentId: Id) => void;
  onVote?: (cardId: Id) => void;
  onCommentClick?: (cardId: Id) => void;
  /** When true, hide the body and add-card button (i.e. swimlanes are rendering cells separately). */
  bodyHidden?: boolean;
  /** Override children (used by swimlane mode). */
  children?: ReactNode;
}

export function KanbanColumn({
  column,
  cards,
  selection,
  cardShape,
  columnShape,
  priorityStyle = 'pill',
  columnAccentStyle = 'cap',
  readonly = false,
  isDropInvalid = false,
  editingTitle = false,
  draggableProvided,
  isColumnDragging = false,
  draggingIds,
  activeId,
  renderCardClone,
  getCloneContainer,
  onToggleCollapse,
  onColumnMenuTrigger,
  onColumnContextMenu,
  onColumnTitleDoubleClick,
  onColumnTitleSubmit,
  onColumnTitleCancel,
  onCardClick,
  onCardDoubleClick,
  onCardMenuTrigger,
  onCardContextMenu,
  onAddCard,
  onAddSubtask,
  onVote,
  onCommentClick,
  bodyHidden,
  children,
}: KanbanColumnProps) {
  const collapsed = !!column.collapsed;

  const cardsCount = cards.length;

  const limitNumber = useMemo(() => {
    if (typeof column.limit === 'number') return column.limit;
    return undefined;
  }, [column.limit]);

  const isOverLimit =
    limitNumber !== undefined ? cardsCount > limitNumber : false;

  const { style: rfdStyle, ...rfdDataProps } =
    draggableProvided?.draggableProps ?? {};

  const style: CSSProperties = {
    ...(column.color
      ? ({ ['--ak-column-color' as string]: column.color } as CSSProperties)
      : {}),
    ...(column.width ? { width: column.width, flex: '0 0 auto' } : {}),
    ...((rfdStyle as CSSProperties) ?? {}),
  };

  const customCss = columnShape?.css?.(column, cards);
  const classNames = [
    'ak-column',
    collapsed && 'ak-column--collapsed',
    isColumnDragging && 'ak-column--dragging',
    customCss,
    column.css,
  ]
    .filter(Boolean)
    .join(' ');

  const selectedSet = useMemo(() => new Set(selection), [selection]);
  const draggingSet = useMemo(
    () => new Set(draggingIds ?? []),
    [draggingIds]
  );

  return (
    <section
      ref={draggableProvided?.innerRef}
      role="region"
      aria-label={column.label}
      className={classNames}
      style={style}
      data-column-id={column.id}
      data-accent={columnAccentStyle}
      {...rfdDataProps}
    >
      <KanbanColumnHeader
        column={column}
        cardsCount={cardsCount}
        isOverLimit={isOverLimit}
        collapsed={collapsed}
        columnShape={columnShape}
        editing={editingTitle}
        onToggleCollapse={onToggleCollapse}
        onMenuTrigger={onColumnMenuTrigger}
        onContextMenu={onColumnContextMenu}
        onTitleDoubleClick={onColumnTitleDoubleClick}
        onTitleSubmit={onColumnTitleSubmit}
        onTitleCancel={onColumnTitleCancel}
        dragHandleProps={draggableProvided?.dragHandleProps ?? undefined}
      />

      {!bodyHidden &&
        (collapsed ? (
          <div className="ak-column__body ak-column__body--collapsed">
            <span className="ak-rotated-label">{column.label}</span>
          </div>
        ) : (
          <div className="ak-column__body">
            {children ?? (
              <Droppable
                droppableId={`column::${column.id}::_`}
                type="CARD"
                isDropDisabled={readonly}
                direction="vertical"
                renderClone={renderCardClone}
                getContainerForClone={getCloneContainer}
              >
                {(provided, snapshot) => {
                  const dropClass = [
                    'ak-column__cards',
                    snapshot.isDraggingOver &&
                      !isDropInvalid &&
                      'ak-column--drop-target',
                    snapshot.isDraggingOver &&
                      isDropInvalid &&
                      'ak-column--drop-invalid',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={dropClass}
                    >
                      {cards.map((card, index) => (
                        <Draggable
                          key={card.id}
                          draggableId={String(card.id)}
                          index={index}
                          isDragDisabled={readonly}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <KanbanCard
                              card={card}
                              cardShape={cardShape}
                              priorityStyle={priorityStyle}
                              selected={selectedSet.has(card.id)}
                              dragging={dragSnapshot.isDragging}
                              hidden={
                                draggingSet.has(card.id) &&
                                activeId !== undefined &&
                                card.id !== activeId
                              }
                              draggableProvided={dragProvided}
                              onClick={(e) => onCardClick?.(card, e)}
                              onDoubleClick={(e) =>
                                onCardDoubleClick?.(card, e)
                              }
                              onMenuTrigger={(e) =>
                                onCardMenuTrigger?.(card, e)
                              }
                              onContextMenu={(e) =>
                                onCardContextMenu?.(card, e)
                              }
                              onAddSubtask={onAddSubtask}
                              onVote={onVote}
                              onCommentClick={onCommentClick}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {!readonly && (
                        <button
                          type="button"
                          className="ak-column__add-btn"
                          onClick={() => onAddCard?.(column.id)}
                          aria-label={`Add card to ${column.label}`}
                          title="New card here"
                        >
                          <i className="ti ti-plus" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                }}
              </Droppable>
            )}
          </div>
        ))}

      {column.overlay && (
        <div className="ak-column__overlay" role="presentation">
          {column.overlay}
        </div>
      )}
    </section>
  );
}
