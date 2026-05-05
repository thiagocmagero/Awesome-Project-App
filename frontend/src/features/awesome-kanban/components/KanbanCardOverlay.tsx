import type { Card, CardShape } from '../types';
import { KanbanCard } from './KanbanCard';

export interface KanbanCardOverlayProps {
  card: Card;
  cardShape?: CardShape;
  /** Multi-select count to display as a badge on the ghost. */
  multiCount?: number;
}

/**
 * Drag ghost rendered inside the `renderClone` of @hello-pangea/dnd's
 * Droppable. Footprint matches the original card; the multi-select badge
 * shows how many cards are being moved together.
 */
export function KanbanCardOverlay({
  card,
  cardShape,
  multiCount,
}: KanbanCardOverlayProps) {
  return (
    <div className="ak-card-overlay" style={{ position: 'relative' }}>
      <KanbanCard card={card} cardShape={cardShape} ghost />
      {multiCount && multiCount > 1 && (
        <span
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            minWidth: 22,
            height: 22,
            padding: '0 6px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: 'var(--ak-primary)',
            color: 'white',
            fontFamily: 'var(--ak-font-mono)',
            fontSize: 11,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(31, 36, 48, 0.18)',
          }}
        >
          {multiCount}
        </span>
      )}
    </div>
  );
}
