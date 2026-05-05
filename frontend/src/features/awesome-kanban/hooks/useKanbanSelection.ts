import { useCallback } from 'react';
import type { Card, Id } from '../types';

export interface UseKanbanSelectionOptions {
  selection: Id[];
  setSelection: (next: Id[]) => void;
  cards: Card[];
  multiselect?: boolean;
  onSelectionChange?: (selection: Id[]) => void;
}

export interface UseKanbanSelectionResult {
  selectedSet: Set<Id>;
  isSelected: (id: Id) => boolean;
  toggle: (id: Id, modifiers: SelectionModifiers) => void;
  selectOnly: (id: Id) => void;
  selectMany: (ids: Id[]) => void;
  clear: () => void;
}

export interface SelectionModifiers {
  shift?: boolean;
  ctrl?: boolean;
}

/**
 * Centralised card selection logic.
 *  - plain click → select only this card
 *  - ctrl/cmd + click → toggle, additive
 *  - shift + click → range selection within the *same column*
 * Mirrors §4.1 of the spec.
 */
export function useKanbanSelection({
  selection,
  setSelection,
  cards,
  multiselect = true,
  onSelectionChange,
}: UseKanbanSelectionOptions): UseKanbanSelectionResult {
  const selectedSet = new Set(selection);

  const apply = useCallback(
    (next: Id[]) => {
      setSelection(next);
      onSelectionChange?.(next);
    },
    [setSelection, onSelectionChange]
  );

  const isSelected = useCallback((id: Id) => selectedSet.has(id), [selectedSet]);

  const selectOnly = useCallback(
    (id: Id) => {
      apply([id]);
    },
    [apply]
  );

  const selectMany = useCallback(
    (ids: Id[]) => {
      apply(Array.from(new Set(ids)));
    },
    [apply]
  );

  const clear = useCallback(() => apply([]), [apply]);

  const toggle = useCallback(
    (id: Id, modifiers: SelectionModifiers) => {
      if (!multiselect) {
        apply([id]);
        return;
      }

      // Shift = range within the same column
      if (modifiers.shift && selection.length > 0) {
        const target = cards.find((c) => c.id === id);
        const anchor = cards.find((c) => c.id === selection[selection.length - 1]);
        if (target && anchor && target.columnId === anchor.columnId) {
          const sameCol = cards.filter((c) => c.columnId === target.columnId);
          const ai = sameCol.findIndex((c) => c.id === anchor.id);
          const ti = sameCol.findIndex((c) => c.id === id);
          if (ai >= 0 && ti >= 0) {
            const [from, to] = ai < ti ? [ai, ti] : [ti, ai];
            const range = sameCol.slice(from, to + 1).map((c) => c.id);
            apply(Array.from(new Set([...selection, ...range])));
            return;
          }
        }
        // Fallback: just add this id
        apply(Array.from(new Set([...selection, id])));
        return;
      }

      // Ctrl/Cmd = toggle additive
      if (modifiers.ctrl) {
        if (selectedSet.has(id)) {
          apply(selection.filter((s) => s !== id));
        } else {
          apply([...selection, id]);
        }
        return;
      }

      // Plain click
      apply([id]);
    },
    [multiselect, selection, cards, apply, selectedSet]
  );

  return { selectedSet, isSelected, toggle, selectOnly, selectMany, clear };
}
