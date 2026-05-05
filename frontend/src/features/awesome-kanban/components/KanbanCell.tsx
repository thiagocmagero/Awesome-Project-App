import { type MouseEvent, useMemo } from 'react';
import {
  Draggable,
  Droppable,
  type DraggableProvided,
  type DraggableRubric,
  type DraggableStateSnapshot,
} from '@hello-pangea/dnd';
import type { Card, CardShape, Column, Id, Row } from '../types';
import { KanbanCard } from './KanbanCard';
import { KanbanDropZone } from './KanbanDropZone';

export interface KanbanCellProps {
  column: Column;
  row: Row | null;
  cards: Card[];
  selection: Id[];
  cardShape?: CardShape;
  priorityStyle?: 'pill' | 'dot' | 'stripe';
  dropHereLabel?: string;
  readonly?: boolean;
  /** Highlight in red when the hovering drag is invalid. */
  isDropInvalid?: boolean;
  /** Set of card ids being dragged (multi-select); non-leader members are
   *  hidden so the user sees a single ghost during drag. */
  draggingIds?: Id[];
  /** The leader card id (the one the user grabbed). Visible during drag; the
   *  other members of `draggingIds` are hidden. */
  activeId?: Id;
  /** Custom drag ghost renderer (badge with multi-select count). */
  renderCardClone?: (
    provided: DraggableProvided,
    snapshot: DraggableStateSnapshot,
    rubric: DraggableRubric
  ) => JSX.Element;
  /** Anchor for the renderClone portal so it inherits `.ak-board` CSS vars. */
  getCloneContainer?: () => HTMLElement;
  onCardClick?: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardDoubleClick?: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardMenuTrigger?: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onCardContextMenu?: (card: Card, e: MouseEvent<HTMLElement>) => void;
  onAddCard?: (columnId: Id, rowId?: Id) => void;
  onAddSubtask?: (parentId: Id) => void;
  onVote?: (cardId: Id) => void;
  onCommentClick?: (cardId: Id) => void;
}

/**
 * Single intersection of a column × swimlane.
 * Renders cards or the empty drop zone, plus the hover-revealed `+` button.
 */
export function KanbanCell({
  column,
  row,
  cards,
  selection,
  cardShape,
  priorityStyle = 'pill',
  dropHereLabel = 'DROP HERE',
  readonly = false,
  isDropInvalid = false,
  draggingIds,
  activeId,
  renderCardClone,
  getCloneContainer,
  onCardClick,
  onCardDoubleClick,
  onCardMenuTrigger,
  onCardContextMenu,
  onAddCard,
  onAddSubtask,
  onVote,
  onCommentClick,
}: KanbanCellProps) {
  const selectedSet = useMemo(() => new Set(selection), [selection]);
  const draggingSet = useMemo(
    () => new Set(draggingIds ?? []),
    [draggingIds]
  );
  const isEmpty = cards.length === 0;
  const droppableId = `cell::${column.id}::${row?.id ?? '_'}`;

  return (
    <Droppable
      droppableId={droppableId}
      type="CARD"
      isDropDisabled={readonly}
      direction="vertical"
      renderClone={renderCardClone}
      getContainerForClone={getCloneContainer}
    >
      {(provided, snapshot) => {
        const isActive = snapshot.isDraggingOver;
        const classNames = [
          'ak-cell',
          isActive && !isDropInvalid && 'ak-cell--drop-target',
          isActive && isDropInvalid && 'ak-cell--drop-invalid',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={classNames}
            data-column-id={column.id}
            data-row-id={row?.id ?? ''}
          >
            {isEmpty && (
              <KanbanDropZone
                columnColor={column.color}
                label={dropHereLabel}
                invalid={isDropInvalid && isActive}
                active={isActive && !isDropInvalid}
              />
            )}
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
                    onDoubleClick={(e) => onCardDoubleClick?.(card, e)}
                    onMenuTrigger={(e) => onCardMenuTrigger?.(card, e)}
                    onContextMenu={(e) => onCardContextMenu?.(card, e)}
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
                onClick={() => onAddCard?.(column.id, row?.id)}
                aria-label={
                  row
                    ? `Add card to ${column.label} / ${row.label}`
                    : `Add card to ${column.label}`
                }
                title="New card here"
              >
                <i className="ti ti-plus" aria-hidden="true" />
              </button>
            )}
          </div>
        );
      }}
    </Droppable>
  );
}
