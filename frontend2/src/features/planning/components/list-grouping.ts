// Helpers de agrupamento da Lista — 4 modos: state / assignee / priority / none.
// Cada modo devolve `GroupView[]` (ordem dos grupos determinada pelo modo).
//
// Decisões:
//   - assignee: itera TODOS os `task.owner_id` — uma task com N responsáveis
//     aparece em N grupos. Tasks sem owner caem em "Sem responsável"
//     (i18n key `list.group.no_assignee`). Ordem alfabética por nome; grupo
//     "Sem responsável" sempre no fim, independente da direção.
//   - priority: 4 grupos pré-definidos (URGENT/HIGH/MED/LOW) + "Sem prioridade"
//     no fim. Ordem fixa por gravidade (não alfabética); inverte com
//     `groupOrder='desc'` (LOW → URGENT) mas "Sem prioridade" continua no fim.
//   - none: 1 grupo único sem header (todas as tasks numa lista plana).
//   - state: mantém comportamento existente (groupTasks por ordem dos states).
//
// `groupOrder` é aplicado APENAS aos grupos "conhecidos" (com label real);
// grupos de fallback ("Sem responsável", "Sem prioridade") ficam sempre no
// fim, qualquer que seja a direção.

import { resolveStateColor, type IProjectMember, type ITask, type ITaskState } from '../types';

export type GroupBy = 'state' | 'assignee' | 'priority' | 'none';

export interface GroupView {
  /** Chave estável para `key`, `Set` de collapsed, etc. */
  key: string;
  /** Label visível. Para `state` é o nome (resolvido pelo caller via i18n). */
  label: string | null;
  /** Cor opcional do swatch — só para state e priority. */
  color: string | null;
  tasks: ITask[];
  /** Indica se este grupo representa estados/responsáveis "concluídos"/etc.
   *  (Usado actualmente apenas para state — DONE risca o texto). */
  done?: boolean;
  /** State quando groupBy='state'. Permite ao caller usar a sua color/systemKey. */
  state?: ITaskState;
}

/** Prioridade i18n + cor (espelhado de PriorityBadge.tsx). */
const PRIORITY_BUCKETS: Array<{ value: number; key: string; color: string }> = [
  { value: 3, key: 'priority.urgent', color: '#dc2626' },
  { value: 2, key: 'priority.high',   color: '#ef4444' },
  { value: 1, key: 'priority.med',    color: '#f59e0b' },
  { value: 0, key: 'priority.low',    color: '#22c55e' },
];

// ─── Agrupamento ────────────────────────────────────────────────────────────

export function groupTasksByState(
  tasks: ITask[],
  states: ITaskState[],
  resolveLabel: (s: ITaskState) => string,
): GroupView[] {
  const ordered = [...states].sort((a, b) => a.position - b.position);
  const byState = new Map<string, ITask[]>();
  for (const s of ordered) byState.set(s.publicId, []);
  for (const t of tasks) {
    if (t.boardColumn && byState.has(t.boardColumn)) {
      byState.get(t.boardColumn)!.push(t);
    }
  }
  return ordered.map((state) => ({
    key:    state.publicId,
    label:  resolveLabel(state),
    color:  resolveStateColor(state),
    tasks:  byState.get(state.publicId) ?? [],
    done:   state.systemKey === 'DONE' || state.type === 'FINAL',
    state,
  }));
}

export interface GroupOrderOptions {
  /** Direção da ordem dos grupos (label asc/desc).
   *  Default: ordem natural (alfabética asc para assignee;
   *  URGENT→LOW para priority). Fallback groups ficam sempre no fim. */
  groupOrder?: 'asc' | 'desc';
}

export function groupTasksByAssignee(
  tasks: ITask[],
  membersByPublicId: Map<string, IProjectMember>,
  noAssigneeLabel: string,
  options: GroupOrderOptions = {},
): GroupView[] {
  const buckets = new Map<string, ITask[]>();
  // Itera TODOS os owners — task com N responsáveis aparece em N grupos.
  for (const t of tasks) {
    const owners = Array.isArray(t.owner_id) ? t.owner_id : [];
    if (owners.length === 0) {
      const k = '__none__';
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(t);
    } else {
      for (const oid of owners) {
        if (!buckets.has(oid)) buckets.set(oid, []);
        buckets.get(oid)!.push(t);
      }
    }
  }
  // Ordem: alfabética por nome (members conhecidos); "__none__" sempre no fim.
  const knownKeys = [...buckets.keys()].filter((k) => k !== '__none__');
  knownKeys.sort((a, b) => {
    const na = (membersByPublicId.get(a)?.name ?? '').toLowerCase();
    const nb = (membersByPublicId.get(b)?.name ?? '').toLowerCase();
    return na.localeCompare(nb);
  });
  if (options.groupOrder === 'desc') knownKeys.reverse();
  const result: GroupView[] = knownKeys.map((id) => {
    const mem = membersByPublicId.get(id);
    return {
      key:   `assignee:${id}`,
      label: mem?.name ?? id.slice(0, 8),
      color: null, // cor virá do avatarColorFor no render (com avatar)
      tasks: buckets.get(id) ?? [],
    };
  });
  if (buckets.has('__none__')) {
    result.push({
      key:   'assignee:__none__',
      label: noAssigneeLabel,
      color: '#9ca3af',
      tasks: buckets.get('__none__') ?? [],
    });
  }
  return result;
}

export function groupTasksByPriority(
  tasks: ITask[],
  resolveLabel: (key: string) => string,
  noPriorityLabel: string,
  options: GroupOrderOptions = {},
): GroupView[] {
  const buckets = new Map<number, ITask[]>();
  const noneList: ITask[] = [];
  for (const t of tasks) {
    if (typeof t.priority === 'number' && PRIORITY_BUCKETS.some((b) => b.value === t.priority)) {
      if (!buckets.has(t.priority)) buckets.set(t.priority, []);
      buckets.get(t.priority)!.push(t);
    } else {
      noneList.push(t);
    }
  }
  // Default (asc) é URGENT → HIGH → MED → LOW (ordem semântica natural).
  // `desc` inverte para LOW → MED → HIGH → URGENT.
  const orderedBuckets = options.groupOrder === 'desc'
    ? [...PRIORITY_BUCKETS].reverse()
    : PRIORITY_BUCKETS;
  const result: GroupView[] = orderedBuckets
    .filter((b) => buckets.has(b.value))
    .map((b) => ({
      key:   `priority:${b.value}`,
      label: resolveLabel(b.key),
      color: b.color,
      tasks: buckets.get(b.value) ?? [],
    }));
  if (noneList.length > 0) {
    result.push({
      key:   'priority:__none__',
      label: noPriorityLabel,
      color: '#9ca3af',
      tasks: noneList,
    });
  }
  return result;
}

export function groupTasksFlat(tasks: ITask[]): GroupView[] {
  return [{
    key:   '__all__',
    label: null, // sem header
    color: null,
    tasks,
  }];
}
