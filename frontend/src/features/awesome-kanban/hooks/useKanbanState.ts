import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card, Column, Id, Link, Row } from '../types';

export interface UseKanbanStateOptions {
  /** Controlled values — when defined, biblioteca segue a prop. */
  columns?: Column[];
  rows?: Row[];
  cards?: Card[];
  links?: Link[];
  /** Initial uncontrolled values. */
  defaultColumns?: Column[];
  defaultRows?: Row[];
  defaultCards?: Card[];
  defaultLinks?: Link[];
  /** Notification of full-state changes (uncontrolled mode). */
  onChange?: (state: {
    columns: Column[];
    rows: Row[];
    cards: Card[];
    links: Link[];
    selection: Id[];
  }) => void;
}

export interface UseKanbanStateResult {
  columns: Column[];
  rows: Row[];
  cards: Card[];
  links: Link[];
  selection: Id[];
  setColumns: (next: Column[]) => void;
  setRows: (next: Row[]) => void;
  setCards: (next: Card[]) => void;
  setLinks: (next: Link[]) => void;
  setSelection: (next: Id[]) => void;
  /** Snapshot getter — used by the imperative API. */
  getState: () => {
    columns: Column[];
    rows: Row[];
    cards: Card[];
    links: Link[];
    selection: Id[];
  };
}

/**
 * Resolves between controlled and uncontrolled mode for each dataset slice
 * independently — i.e. you can control `columns` while leaving `cards`
 * uncontrolled. Internal state is the source of truth in uncontrolled mode;
 * external props win whenever they're provided.
 */
export function useKanbanState(
  options: UseKanbanStateOptions
): UseKanbanStateResult {
  const {
    columns: controlledColumns,
    rows: controlledRows,
    cards: controlledCards,
    links: controlledLinks,
    defaultColumns = [],
    defaultRows = [],
    defaultCards = [],
    defaultLinks = [],
    onChange,
  } = options;

  const [internalColumns, setInternalColumns] = useState(defaultColumns);
  const [internalRows, setInternalRows] = useState(defaultRows);
  const [internalCards, setInternalCards] = useState(defaultCards);
  const [internalLinks, setInternalLinks] = useState(defaultLinks);
  const [selection, setSelection] = useState<Id[]>([]);

  const columns = controlledColumns ?? internalColumns;
  const rows = controlledRows ?? internalRows;
  const cards = controlledCards ?? internalCards;
  const links = controlledLinks ?? internalLinks;

  const stateRef = useRef({ columns, rows, cards, links, selection });
  stateRef.current = { columns, rows, cards, links, selection };

  const setColumns = useCallback(
    (next: Column[]) => {
      if (controlledColumns === undefined) setInternalColumns(next);
    },
    [controlledColumns]
  );

  const setRows = useCallback(
    (next: Row[]) => {
      if (controlledRows === undefined) setInternalRows(next);
    },
    [controlledRows]
  );

  const setCards = useCallback(
    (next: Card[]) => {
      if (controlledCards === undefined) setInternalCards(next);
    },
    [controlledCards]
  );

  const setLinks = useCallback(
    (next: Link[]) => {
      if (controlledLinks === undefined) setInternalLinks(next);
    },
    [controlledLinks]
  );

  // Notify when the *internal* state changes (uncontrolled).
  // We avoid emitting on the very first render.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    onChange?.({
      columns,
      rows,
      cards,
      links,
      selection,
    });
  }, [columns, rows, cards, links, selection, onChange]);

  const getState = useCallback(() => stateRef.current, []);

  return {
    columns,
    rows,
    cards,
    links,
    selection,
    setColumns,
    setRows,
    setCards,
    setLinks,
    setSelection,
    getState,
  };
}
