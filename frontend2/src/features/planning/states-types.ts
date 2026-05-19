// Tipos partilhados pelos consumidores de Estados (BoardColumns) do projeto.
// Port literal de `frontend/src/features/planning/states-types.ts` — regra 4
// do MIGRATION.md.

export type TaskStateColumnType = 'INITIAL' | 'INTERMEDIATE' | 'FINAL';

export type TaskFieldKey =
  | 'description'
  | 'schedule'
  | 'duration'
  | 'restriction'
  | 'type'
  | 'priority'
  | 'assignees';

export interface IFieldRule {
  field: TaskFieldKey;
  isRequired: boolean;
}

export interface ITaskState {
  publicId: string;
  /** custom label; null → usar `labelKey` para resolver via i18n */
  label: string | null;
  /** chave i18n no namespace `planning` (ex.: 'states.todo') quando `label` é null */
  labelKey: string | null;
  /** 'TODO' | 'INPROGRESS' | 'DONE' | null */
  systemKey: string | null;
  type: TaskStateColumnType;
  isSystem: boolean;
  position: number;
  color: string | null;
  wipLimit: number | null;
  rules: IFieldRule[];
}

export interface ITaskSwimlane {
  publicId: string;
  label: string | null;
  labelKey: string | null;
  isPrimary: boolean;
  color: string | null;
  position: number;
  collapsed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cores nativas de estados sistema
// ─────────────────────────────────────────────────────────────────────────────
// Quando `BoardColumn.color` está NULL no DB (estado de sistema sem override
// do utilizador), o frontend deriva uma cor por `systemKey` para garantir
// diferenciação visual entre TODO/IN_PROGRESS/DONE. Assim que o utilizador
// define uma cor custom em "Gerir Estados", esse valor prevalece.

const SYSTEM_STATE_COLORS: Record<string, string> = {
  TODO: '#94a3b8',         // slate-400 — neutro/início
  INPROGRESS: '#3b82f6',   // blue-500  — work in progress
  DONE: '#22c55e',         // green-500 — concluído
};

const DEFAULT_STATE_COLOR = '#6b7280'; // gray-500 — custom sem cor

export function resolveStateColor(state: ITaskState | null | undefined): string {
  if (!state) return DEFAULT_STATE_COLOR;
  if (state.color) return state.color;
  if (state.systemKey && SYSTEM_STATE_COLORS[state.systemKey]) {
    return SYSTEM_STATE_COLORS[state.systemKey];
  }
  return DEFAULT_STATE_COLOR;
}
