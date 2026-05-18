// Definição canónica das colunas da Lista. Espelho de
// NewTemplate/app-dark.jsx:1066-1076.

import type { IProjectMember, ITask, ITaskState } from '../types';

export interface ListColDef {
  key: ListColKey;
  /** Chave i18n (namespace `planning`). */
  labelKey: string;
  width: string;
  /** Default visível? */
  def: boolean;
  /** Coluna ordenável por click no header? Default true. */
  sortable?: boolean;
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

// ─── Sort comparators ────────────────────────────────────────────────────────
//
// Cada coluna define como extrair um valor comparável da task. Valores
// `null`/`undefined` vão sempre para o fim (independente da direção asc/desc).
// Datas em wire DHTMLX `"DD-MM-YYYY HH:mm"` são convertidas para timestamp via
// `parseGanttDateMs`; ISO 8601 (`createdAt`) parse-ado directamente.

export interface SortContext {
  membersByPublicId: Map<string, IProjectMember>;
  statesByPublicId: Map<string, ITaskState>;
}

export type SortValue = number | string | null;

function parseGanttDateMs(s: string | undefined | null): number | null {
  if (!s) return null;
  // Format "DD-MM-YYYY HH:mm"
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!m) {
    // Tentar ISO
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d.getTime() : null;
  }
  const [, dd, mm, yyyy, hh = '00', mi = '00'] = m;
  return Date.UTC(+yyyy, +mm - 1, +dd, +hh, +mi);
}

function parseIsoMs(s: string | undefined | null): number | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

export function sortValueFor(col: ListColKey, task: ITask, ctx: SortContext): SortValue {
  switch (col) {
    case 'start':    return parseGanttDateMs(task.start_date);
    case 'end':      return parseGanttDateMs(task.end_date);
    case 'duration': return typeof task.duration === 'number' ? task.duration : null;
    case 'progress': return typeof task.progress === 'number' ? task.progress : null;
    case 'priority': return typeof task.priority === 'number' ? task.priority : null;
    case 'state': {
      if (!task.boardColumn) return null;
      const s = ctx.statesByPublicId.get(task.boardColumn);
      if (!s) return null;
      return s.position;
    }
    case 'owner': {
      const first = task.owner_id?.[0];
      if (!first) return null;
      const mem = ctx.membersByPublicId.get(first);
      return (mem?.name ?? '').toLowerCase();
    }
    case 'created':  return parseIsoMs(task.createdAt);
    case 'type':     return (task.type ?? '').toLowerCase();
    default:         return null;
  }
}

/** Comparator que respeita asc/desc e empurra nulls para o fim. */
export function makeSorter(col: ListColKey, dir: 'asc' | 'desc', ctx: SortContext) {
  const mult = dir === 'asc' ? 1 : -1;
  return (a: ITask, b: ITask): number => {
    const va = sortValueFor(col, a, ctx);
    const vb = sortValueFor(col, b, ctx);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return mult * (va - vb);
    return mult * String(va).localeCompare(String(vb));
  };
}

export function defaultColVisibility(): Record<ListColKey, boolean> {
  const out = {} as Record<ListColKey, boolean>;
  for (const c of ALL_COLS) out[c.key] = c.def;
  return out;
}
