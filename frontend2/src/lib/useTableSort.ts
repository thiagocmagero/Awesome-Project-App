// Hook genérico de ordenação para tabelas.
//
// Padrão obrigatório (MIGRATION.md): toda tabela criada em `frontend2/` deve
// suportar ordenação por click no header. Este hook + o componente
// `<SortableTh>` em `components/SortableTh.tsx` são a forma canónica de
// implementar essa ordenação — sem duplicar comparators ou state.
//
// API mínima:
//   const { sortBy, toggleSort, sorted } = useTableSort(items, [
//     { key: 'name',  getValue: (m) => m.name.toLowerCase() },
//     { key: 'email', getValue: (m) => (m.email ?? '').toLowerCase() },
//     ...
//   ]);
//
// Click toggle: 1º asc → 2º desc → 3º limpa (volta à ordem original).
// Valores `null`/`undefined` vão sempre para o fim (independente da direção).

import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

export type SortableValue = number | string | null | undefined;

export interface SortableColumn<T, K extends string> {
  key: K;
  /** Extractor do valor comparável. Devolver `null`/`undefined` empurra para o fim. */
  getValue?: (item: T) => SortableValue;
  /** false desabilita o sort nesta coluna (header não-clicável). Default true. */
  sortable?: boolean;
}

export interface UseTableSortResult<T, K extends string> {
  sortBy: SortState<K> | null;
  toggleSort: (key: K) => void;
  sorted: T[];
}

export function useTableSort<T, K extends string>(
  items: T[],
  columns: ReadonlyArray<SortableColumn<T, K>>,
  initialSort: SortState<K> | null = null,
): UseTableSortResult<T, K> {
  const [sortBy, setSortBy] = useState<SortState<K> | null>(initialSort);

  function toggleSort(key: K) {
    const col = columns.find((c) => c.key === key);
    if (!col || col.sortable === false) return;
    setSortBy((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  const sorted = useMemo(() => {
    if (!sortBy) return items;
    const col = columns.find((c) => c.key === sortBy.key);
    if (!col || !col.getValue) return items;
    const get = col.getValue;
    const mult = sortBy.dir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return mult * (va - vb);
      return mult * String(va).localeCompare(String(vb));
    });
  }, [items, sortBy, columns]);

  return { sortBy, toggleSort, sorted };
}
