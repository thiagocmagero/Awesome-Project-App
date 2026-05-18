// Definição canónica das colunas da Lista. Espelho de
// NewTemplate/app-dark.jsx:1066-1076.

export interface ListColDef {
  key: ListColKey;
  /** Chave i18n (namespace `planning`). */
  labelKey: string;
  width: string;
  /** Default visível? */
  def: boolean;
}

export type ListColKey =
  | 'start'
  | 'end'
  | 'duration'
  | 'progress'
  | 'priority'
  | 'state'
  | 'owner'
  | 'created'
  | 'type';

export const ALL_COLS: readonly ListColDef[] = [
  { key: 'start',    labelKey: 'table.start_date', width: '100px', def: true  },
  { key: 'end',      labelKey: 'table.end_date',   width: '100px', def: true  },
  { key: 'duration', labelKey: 'table.duration',   width: '80px',  def: true  },
  { key: 'progress', labelKey: 'table.progress',   width: '90px',  def: false },
  { key: 'priority', labelKey: 'table.priority',   width: '100px', def: true  },
  { key: 'state',    labelKey: 'table.state',      width: '120px', def: true  },
  { key: 'owner',    labelKey: 'table.owner',      width: '110px', def: true  },
  { key: 'created',  labelKey: 'table.created_at', width: '140px', def: true  },
  { key: 'type',     labelKey: 'table.type',       width: '90px',  def: false },
] as const;

export function defaultColVisibility(): Record<ListColKey, boolean> {
  const out = {} as Record<ListColKey, boolean>;
  for (const c of ALL_COLS) out[c.key] = c.def;
  return out;
}
