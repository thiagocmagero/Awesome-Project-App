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
