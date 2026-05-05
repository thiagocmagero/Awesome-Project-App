// Mappers entre o domain (backend) e a shape do widget AwesomeKanban.
// Domain: BoardColumn / BoardSwimlane / GanttTask
// Widget: Column / Row / Card (vendor `awesome-kanban`)
//
// Notas críticas:
// - Todos os IDs de domain são `publicId` (string UUID v7). O widget aceita
//   string|number e nós usamos sempre string aqui.
// - `task.priority` vem como `number | undefined` (1=High, 2=Medium, 3=Low).
//   AwesomeKanban espera `Card.priority` como string ('high'|'medium'|'low'|'none').
// - `task.parent` vem como `number` (id interno DHTMLX). Para mapear para
//   `Card.subtaskOf` (publicId), usamos a lookup map `idToPublicId`.

import type { Card, Column, Row } from 'awesome-kanban';
import type { ITaskState, ITaskSwimlane } from '../planning/states-types';
import type { GanttTask } from '../planning/types';
import { ganttToDate } from '../planning/ganttDateUtils';

// ─── Priority ───────────────────────────────────────────────────────────────

export const PRIORITY_NUM_TO_STR: Record<number, 'high' | 'medium' | 'low'> = {
  1: 'high',
  2: 'medium',
  3: 'low',
};
export const PRIORITY_STR_TO_NUM: Record<string, number | null> = {
  high:   1,
  medium: 2,
  low:    3,
  none:   null,
};

export function priorityToCard(p: number | null | undefined): string | undefined {
  if (p == null) return undefined;
  return PRIORITY_NUM_TO_STR[p];
}

export function priorityToTask(p: string | undefined | null): number | null {
  if (!p || p === 'none') return null;
  return PRIORITY_STR_TO_NUM[p] ?? null;
}

// ─── State (BoardColumn) → Column ───────────────────────────────────────────

/**
 * Converte um Estado em Column do widget.
 *
 * @param resolveLabel — função que devolve o label final dado um state (resolve
 *  i18n via `labelKey` quando `label` é null). Passada de fora para evitar
 *  acoplar o mapper a `react-i18next`.
 */
export function stateToColumn(
  state: ITaskState,
  resolveLabel: (state: ITaskState) => string,
): Column {
  return {
    id: state.publicId,
    label: resolveLabel(state),
    color: state.color ?? undefined,
    limit: state.wipLimit ?? undefined,
    data: { isSystem: state.isSystem, systemKey: state.systemKey, type: state.type },
  };
}

// ─── Swimlane (BoardSwimlane) → Row ─────────────────────────────────────────

export function swimlaneToRow(
  sw: ITaskSwimlane,
  resolveLabel: (sw: ITaskSwimlane) => string,
): Row {
  return {
    id: sw.publicId,
    label: resolveLabel(sw),
    color: sw.color ?? undefined,
    collapsed: sw.collapsed,
    data: { isPrimary: sw.isPrimary },
  };
}

// ─── Task (GanttTask) → Card ────────────────────────────────────────────────

export function taskToCard(
  task: GanttTask,
  idToPublicId: Map<number, string>,
  fallbackColumnPublicId: string,
  fallbackSwimlanePublicId?: string,
  idToText?: Map<number, string>,
  childCounts?: Map<number, { total: number; done: number }>,
): Card {
  const subtaskOfPublicId = task.parent && task.parent !== 0
    ? idToPublicId.get(task.parent)
    : undefined;

  // Label do card-pai para mostrar no subtask badge (campo custom)
  const parentLabel =
    task.parent && task.parent !== 0 && idToText
      ? idToText.get(task.parent)
      : undefined;

  // Contagem de subtarefas concluídas / total — progresso em fracção X/Y
  const childData = childCounts?.get(task.id);

  return {
    id: task.publicId,
    label: task.text,
    description: undefined,
    columnId: task.boardColumn || fallbackColumnPublicId,
    // Sem `boardSwimlane` atribuído + rows visíveis no widget ⇒ card invisível.
    // Se existir uma primária, recolhe os órfãos. Sem primária, fica `undefined`
    // (o consumidor — BoardView — limpa o rowId quando swimlanes estão off).
    rowId: task.boardSwimlane || fallbackSwimlanePublicId || undefined,
    priority: priorityToCard(task.priority),
    progress: typeof task.progress === 'number' ? task.progress * 100 : undefined,
    startDate: task.start_date ? ganttToDate(task.start_date) ?? undefined : undefined,
    endDate: task.end_date ? ganttToDate(task.end_date) ?? undefined : undefined,
    users: task.owner_id ?? [],
    subtaskOf: subtaskOfPublicId,
    parentLabel,
    progressDone: childData?.done,
    progressTotal: childData?.total,
    commentCount: task.commentCount ?? 0,
  };
}

// ─── Column → CreateBoardColumnDto (POST /states) ───────────────────────────

export interface CreateColumnPayload {
  label: string;
  color?: string | null;
  wipLimit?: number | null;
}

export function columnAddEventToPayload(column: Partial<Column>): CreateColumnPayload {
  return {
    label: typeof column.label === 'string' ? column.label : '',
    color: typeof column.color === 'string' ? column.color : undefined,
    wipLimit: typeof column.limit === 'number' ? column.limit : undefined,
  };
}

// ─── Column update → PATCH /states/:id ──────────────────────────────────────

export interface UpdateColumnPayload {
  label?: string | null;
  color?: string | null;
  wipLimit?: number | null;
}

export function columnUpdateEventToPayload(patch: Partial<Column>): UpdateColumnPayload {
  const out: UpdateColumnPayload = {};
  if ('label' in patch) out.label = (patch.label as string) ?? null;
  if ('color' in patch) out.color = (patch.color as string) ?? null;
  if ('limit' in patch) out.wipLimit = typeof patch.limit === 'number' ? patch.limit : null;
  return out;
}

// ─── Row → CreateBoardSwimlaneDto / UpdateBoardSwimlaneDto ──────────────────

export interface CreateSwimlanePayload {
  label?: string | null;
  color?: string | null;
}

export function rowAddEventToPayload(row: Partial<Row>): CreateSwimlanePayload {
  return {
    label: typeof row.label === 'string' ? row.label : null,
    color: typeof row.color === 'string' ? row.color : null,
  };
}

export function rowUpdateEventToPayload(patch: Partial<Row>): CreateSwimlanePayload {
  const out: CreateSwimlanePayload = {};
  if ('label' in patch) out.label = (patch.label as string) ?? null;
  if ('color' in patch) out.color = (patch.color as string) ?? null;
  return out;
}

// ─── Card move → PATCH /tasks/:id/state ─────────────────────────────────────

export interface MoveTaskStatePayload {
  /** publicId da coluna destino */
  stateId?: string | null;
  /** posição dentro da coluna (0-based) */
  position?: number;
  /**
   * Tri-state:
   * - undefined → mantém a swimlane actual
   * - null      → move para a swimlane primária (se existir; senão remove)
   * - string    → publicId da swimlane alvo
   */
  swimlaneId?: string | null;
}

// ─── Card update (GanttTask patch) → PATCH /tasks/:id ───────────────────────

export interface UpdateTaskPayload {
  text?: string;
  /** ISO string ou DHTMLX 'YYYY-MM-DD HH:mm' */
  start_date?: string;
  end_date?: string;
  duration?: number;
  /** 0–1 no backend; o widget usa 0–100 */
  progress?: number;
  priority?: number | null;
  ownerIds?: string[];
}
