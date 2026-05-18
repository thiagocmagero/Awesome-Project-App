// `<SortableTh>` — header de coluna clicável com indicador asc/desc/none.
// Pareado com `useTableSort` (lib/useTableSort.ts).
//
// CSS partilhado: `.sort-header` + `.sort-ind` em styles/sort-header.css
// (importado globalmente via main.tsx). Inherits font-size, color e
// uppercase do `<th>` pai — funciona em qualquer tabela.

import type { CSSProperties } from 'react';
import type { SortState } from '../lib/useTableSort';

interface Props<K extends string> {
  colKey: K;
  label: string;
  sortBy: SortState<K> | null;
  onToggle: (key: K) => void;
  /** false renderiza o th sem cursor pointer e sem chevron de hover. Default true. */
  sortable?: boolean;
  /** Width inline (ex.: '90px'). */
  width?: string | number;
  /** Atributos style extra (ex.: alinhamento). */
  style?: CSSProperties;
}

export function SortableTh<K extends string>({
  colKey, label, sortBy, onToggle, sortable = true, width, style,
}: Props<K>) {
  const isSorted = sortBy?.key === colKey;
  const dir = isSorted ? sortBy!.dir : null;
  return (
    <th style={{ width, ...(style ?? {}) }}>
      <button
        type="button"
        className={'sort-header' + (isSorted ? ' active' : '') + (sortable ? '' : ' disabled')}
        onClick={sortable ? () => onToggle(colKey) : undefined}
        disabled={!sortable}
      >
        <span>{label}</span>
        <span className={'sort-ind' + (isSorted ? ' on' : '')}>
          {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕'}
        </span>
      </button>
    </th>
  );
}
