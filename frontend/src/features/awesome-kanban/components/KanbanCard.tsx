import { type CSSProperties, type MouseEvent, type ReactNode, useCallback } from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';
import type {
  Card,
  CardShape,
  Id,
  PriorityValue,
  UserValue,
} from '../types';
import { getAvatarColor, initials } from '../core/colors';
import { defaultCardShape, defaultPriorityValues } from '../core/defaults';

export interface KanbanCardProps {
  card: Card;
  cardShape?: CardShape;
  priorityStyle?: 'pill' | 'dot' | 'stripe';
  selected?: boolean;
  dragging?: boolean;
  ghost?: boolean;
  /** Hide the card entirely (used for non-leader members of a multi-drag). */
  hidden?: boolean;
  showSubtaskLink?: boolean;
  showSubtaskBadge?: boolean;
  /** DnD wiring from `<Draggable>` — applied to the article root + handle. */
  draggableProvided?: DraggableProvided;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  onDoubleClick?: (e: MouseEvent<HTMLElement>) => void;
  onMenuTrigger?: (e: MouseEvent<HTMLElement>) => void;
  onContextMenu?: (e: MouseEvent<HTMLElement>) => void;
  onAddSubtask?: (parentId: Id) => void;
  onVote?: (cardId: Id) => void;
  onCommentClick?: (cardId: Id) => void;
  className?: string;
}

function isShapeEnabled(
  shape: boolean | { show?: boolean } | undefined,
  fallback = true
): boolean {
  if (shape === undefined) return fallback;
  if (typeof shape === 'boolean') return shape;
  return shape.show !== false;
}

function shapeOptions<T>(
  shape: boolean | T | undefined
): T | undefined {
  if (shape && typeof shape === 'object') return shape as T;
  return undefined;
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function KanbanCard({
  card,
  cardShape,
  priorityStyle = 'pill',
  selected = false,
  dragging = false,
  ghost = false,
  hidden = false,
  draggableProvided,
  onClick,
  onDoubleClick,
  onMenuTrigger,
  onContextMenu,
  onAddSubtask,
  onVote,
  onCommentClick,
  className,
}: KanbanCardProps) {
  const shape: CardShape = { ...defaultCardShape, ...cardShape };

  const priorityShape = shapeOptions<{
    show?: boolean;
    values?: PriorityValue[];
  }>(shape.priority);
  const priorityValues = priorityShape?.values ?? defaultPriorityValues;
  const priorityVisible = isShapeEnabled(shape.priority);

  const usersShape = shapeOptions<{
    show?: boolean;
    values: UserValue[];
    maxCount?: number | false;
  }>(shape.users);
  const usersVisible = isShapeEnabled(shape.users);
  const userValues = usersShape?.values ?? [];
  const maxCount = usersShape?.maxCount ?? 3;

  const cardUserIds = card.users ?? [];
  const cardUsers = cardUserIds
    .map((uid) => userValues.find((u) => u.id === uid))
    .filter((u): u is UserValue => Boolean(u));

  const visibleUsers =
    maxCount === false ? cardUsers : cardUsers.slice(0, maxCount);
  const overflow = maxCount === false ? 0 : cardUsers.length - visibleUsers.length;

  const priority = priorityValues.find((p) => p.id === card.priority);

  const customCss = shape.css?.(card);
  const stripeStyle: CSSProperties =
    priority && priorityStyle === 'stripe'
      ? ({ ['--ak-priority-fg' as string]: priority.fg } as CSSProperties)
      : {};

  const showLabel = isShapeEnabled(shape.label);
  const showProgress =
    isShapeEnabled(shape.progress, false) && typeof card.progress === 'number';
  const showStartDate = isShapeEnabled(shape.start_date) && card.startDate;
  const showEndDate = isShapeEnabled(shape.end_date) && card.endDate;
  const showComments = isShapeEnabled(shape.comments, false);
  // Suporta contagem via campo custom `commentCount` (number) vindo do mapper,
  // ou como fallback o array `card.comments` do tipo nativo do widget.
  const commentCount = (card.commentCount as number | undefined) ?? card.comments?.length ?? 0;
  const showVotes = isShapeEnabled(shape.votes, false);
  const votesShape = shapeOptions<{ show?: boolean; clickable?: boolean }>(
    shape.votes
  );
  const votesClickable = votesShape?.clickable !== false;

  const showSubtaskBadge = !!shape.subtaskBadge && !!card.subtaskOf;
  const showSubtaskLink = !!shape.showSubtaskLink;

  // ── Custom data fields populated by mappers.ts ─────────────────────────────
  const parentLabel = card.parentLabel as string | undefined;
  const progressDone = card.progressDone as number | undefined;
  const progressTotal = card.progressTotal as number | undefined;

  // ── Layout visibility ──────────────────────────────────────────────────────
  // Comments are shown inline in the meta row (right side), not in the footer.
  const hasMeta =
    (usersVisible && cardUsers.length > 0) ||
    (showComments && commentCount > 0);
  const hasDates = !!(showStartDate || showEndDate);
  const hasFooter = showProgress || showVotes || showSubtaskLink;

  // ── Progress display ───────────────────────────────────────────────────────
  const progressPct = Math.max(0, Math.min(100, card.progress ?? 0));
  const progressDisplay =
    progressDone !== undefined && progressTotal !== undefined
      ? `${progressDone}/${progressTotal}`
      : `${Math.round(progressPct)}%`;

  const handleMenuClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      onMenuTrigger?.(e);
    },
    [onMenuTrigger]
  );

  const handleAddSubtask = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      onAddSubtask?.(card.id);
    },
    [onAddSubtask, card.id]
  );

  const handleVote = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      if (votesClickable) onVote?.(card.id);
    },
    [onVote, card.id, votesClickable]
  );

  const handleCommentClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      onCommentClick?.(card.id);
    },
    [onCommentClick, card.id]
  );

  // Custom template path — consumer renders everything.
  if (shape.template) {
    return shape.template({
      cardFields: card,
      selected,
      dragging,
      cardShape: shape,
    }) as ReactNode;
  }

  // ─── DnD wiring ────────────────────────────────────────────────────────────
  const { style: rfdStyle, ...rfdDataProps } =
    draggableProvided?.draggableProps ?? {};
  const handleProps = draggableProvided?.dragHandleProps ?? {};

  const classNames = [
    'ak-card',
    selected && 'ak-card--selected',
    dragging && 'ak-card--dragging',
    ghost && 'ak-card--ghost',
    customCss,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hiddenStyle: CSSProperties = hidden ? { display: 'none' } : {};
  const mergedStyle: CSSProperties = {
    ...stripeStyle,
    ...((rfdStyle as CSSProperties) ?? {}),
    ...hiddenStyle,
  };

  return (
    <article
      ref={draggableProvided?.innerRef}
      role="article"
      aria-selected={selected}
      aria-label={card.label}
      tabIndex={0}
      data-card-id={card.id}
      className={classNames}
      style={mergedStyle}
      {...rfdDataProps}
      {...handleProps}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target as HTMLElement | null;
          const tag = target?.tagName;
          if (
            target &&
            target !== e.currentTarget &&
            (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA')
          ) {
            return;
          }
          e.preventDefault();
          onClick?.(e as unknown as MouseEvent<HTMLElement>);
        }
      }}
    >
      {/* ── Priority stripe (left edge) ──────────────────────────────────── */}
      {priority && priorityStyle === 'stripe' && (
        <span className="ak-card__priority ak-card__priority--stripe" />
      )}

      {/* ── Subtask badge: chain icon + parent label ─────────────────────── */}
      {showSubtaskBadge && (
        <div className="ak-card__subtask-badge">
          {/* Link / chain icon indicating this card is a child */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 2H3a1 1 0 00-1 1v1a1 1 0 001 1h1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M7 2h2a1 1 0 011 1v1a1 1 0 01-1 1H8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M4.5 4.5h3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M5 7.5H3a1 1 0 00-1 1v1a1 1 0 001 1h2"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M7 9h2a1 1 0 001-1V7a1 1 0 00-1-1H8"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M4.5 9h3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="ak-card__subtask-label" title={parentLabel}>
            {parentLabel ?? 'Subtarefa'}
          </span>
        </div>
      )}

      {/* ── Title ────────────────────────────────────────────────────────── */}
      {showLabel && <h3 className="ak-card__title">{card.label}</h3>}

      {/* ── Priority pill / dot ──────────────────────────────────────────── */}
      {priority && priorityVisible && priorityStyle === 'pill' && (
        <span
          className="ak-card__priority ak-card__priority--pill"
          style={{ background: priority.bg, color: priority.fg }}
        >
          {priority.label}
        </span>
      )}

      {priority && priorityVisible && priorityStyle === 'dot' && (
        <span
          className="ak-card__priority ak-card__priority--dot"
          style={
            { ['--ak-priority-fg' as string]: priority.fg } as CSSProperties
          }
        >
          {priority.label}
        </span>
      )}

      {/* ── Meta row: assignee avatars (left) + comment count (right) ────── */}
      {hasMeta && (
        <div className="ak-card__meta">
          {usersVisible && cardUsers.length > 0 && (
            <div className="avatar-list-stacked ak-card__avatars" aria-label="Assignees">
              {visibleUsers.map((user) => (
                <span
                  key={user.id}
                  className="avatar avatar-rounded text-white fw-semibold"
                  style={{ backgroundColor: user.color ?? getAvatarColor(user.id).bg }}
                  title={user.label ?? String(user.id)}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" />
                  ) : (
                    initials(user.label ?? String(user.id))
                  )}
                </span>
              ))}
              {overflow > 0 && (
                <span className="avatar avatar-rounded bg-dark text-white ak-card__avatar--more">
                  +{overflow}
                </span>
              )}
            </div>
          )}

          {showComments && commentCount > 0 && (
            <span
              className="ak-card__comments-inline"
              role="button"
              tabIndex={0}
              aria-label={`${commentCount} comentários`}
              onClick={handleCommentClick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCommentClick(e as unknown as MouseEvent<HTMLElement>); }}
            >
              <i className="ti ti-message-circle-2" aria-hidden="true" />
              {commentCount}
            </span>
          )}
        </div>
      )}

      {/* ── Dates — own row below meta ────────────────────────────────────── */}
      {hasDates && (
        <div className="ak-card__dates">
          {showStartDate && <span>{formatDate(card.startDate)}</span>}
          {showStartDate && showEndDate && (
            <span className="ak-card__date-arrow">→</span>
          )}
          {showEndDate && <span>{formatDate(card.endDate)}</span>}
        </div>
      )}

      {/* ── Footer: progress · votes · subtask CTA ───────────────────────── */}
      {hasFooter && (
        <div className="ak-card__footer">
          <div className="ak-card__footer-left">
            {showProgress && (
              <div className="ak-progress">
                <div className="ak-progress__bar">
                  <div
                    className="ak-progress__fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="ak-progress__count">{progressDisplay}</span>
              </div>
            )}

            {showVotes && (
              <button
                type="button"
                className="ak-card__comments"
                onClick={handleVote}
                aria-label="Vote"
              >
                <i className="ti ti-thumb-up" aria-hidden="true" />
                {card.votes ?? 0}
              </button>
            )}
          </div>

          <div className="ak-card__footer-right">
            {showSubtaskLink && (
              <button
                type="button"
                className="ak-card__subtask-link"
                onClick={handleAddSubtask}
              >
                + Subtarefa
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Card menu trigger (top-right, visible on hover) ──────────────── */}
      {isShapeEnabled(shape.menu) && (
        <button
          type="button"
          className="ak-card__menu-btn"
          aria-label="Open card menu"
          data-menu-id={card.id}
          onClick={handleMenuClick}
        >
          <i className="ti ti-dots-vertical" aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
