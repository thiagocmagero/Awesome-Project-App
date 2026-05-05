import { useMemo } from 'react';
import type { Card } from '../types';

export interface UseKanbanSearchOptions {
  cards: Card[];
  query: string;
  fields?: string[];
}

export interface UseKanbanSearchResult {
  filtered: Card[];
  matches: Set<string | number>;
}

/**
 * Phase 8 — toolbar search filter.
 * Phase 1 ships a synchronous case-insensitive substring matcher; debounce
 * and async suggestions arrive with the toolbar build-out.
 */
export function useKanbanSearch({
  cards,
  query,
  fields = ['label', 'description'],
}: UseKanbanSearchOptions): UseKanbanSearchResult {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { filtered: cards, matches: new Set(cards.map((c) => c.id)) };
    }
    const matches = new Set<string | number>();
    const filtered = cards.filter((card) => {
      const hit = fields.some((f) => {
        const v = (card as Record<string, unknown>)[f];
        return typeof v === 'string' && v.toLowerCase().includes(q);
      });
      if (hit) matches.add(card.id);
      return hit;
    });
    return { filtered, matches };
  }, [cards, query, fields]);
}
