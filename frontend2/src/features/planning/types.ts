// Tipos partilhados da feature Planning em frontend2. Port enxuto de
// `frontend/src/features/planning/types.ts` (regra 4): só os campos necessários
// para a tab Lista nesta entrega. Demais campos (Gantt-specific, etc.) entram
// quando as outras tabs forem portadas.

export type { ITaskState, ITaskSwimlane, IFieldRule, TaskFieldKey, TaskStateColumnType } from './states-types';

export type TaskDurationUnit = 'DAY' | 'HOUR';

export interface ITask {
  publicId: string;
  text: string;
  description?: string | null;
  type: string;
  /** Wire DHTMLX `"DD-MM-YYYY HH:mm"`. Opcional. */
  start_date?: string;
  end_date?: string;
  /** Dias úteis (DAY) ou horas úteis (HOUR). */
  duration: number;
  durationUnit?: TaskDurationUnit;
  /** 0–1. */
  progress: number;
  /** publicIds dos assignees (users do projecto). */
  owner_id: string[];
  /** id numérico DHTMLX-compat; 0 = root. */
  parent: number;
  priority?: number | null;
  constraint_type?: string | null;
  constraint_date?: string | null;
  /** publicId do estado (BoardColumn). Pode ser null em payloads legados. */
  boardColumn: string | null;
  boardSwimlane: string | null;
  boardPosition: number | null;
  commentCount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { publicId: string; name: string } | null;
  updatedBy?: { publicId: string; name: string } | null;
  tags?: Array<{ publicId: string; name: string }>;
}

export interface ITaskLink {
  publicId: string;
  source: number;
  target: number;
  type: string;
  lag: number;
}

export interface IResourceNode {
  /** `TaskResourceNode.publicId` — é este o id que aparece em `task.owner_id[]`. */
  id: string;
  text: string;
  parent: string | null;
  hoursPerDay: number;
  isGroup: boolean;
  /** `User.publicId` quando o node está ligado a um user. `null` para
   *  recursos externos (contractors) e para nós-grupo. Permite ao frontend
   *  distinguir users de externals e fazer dedup com `IProjectMember`. */
  userPublicId: string | null;
  avatarUrl: string | null;
}

export interface IPlanningBundle {
  data: ITask[];
  links: ITaskLink[];
  resources: IResourceNode[];
  nonWorkingDays: string[];
}

/** Detalhes do projecto — shape devolvido por `GET /api/v1/projects/:id`. */
export interface IProjectDetail {
  publicId: string;
  name: string;
  description: string | null;
  status: string;
  priority?: number | null;
  dateFormat: string | null;
  workHours: { start: number; end: number } | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    publicId: string;
    name: string;
    email: string;
    status: string;
    avatarUrl?: string | null;
    avatarUpdatedAt?: string | null;
  } | null;
  manager?: {
    publicId: string;
    name: string;
    email: string;
    status: string;
    avatarUrl?: string | null;
    avatarUpdatedAt?: string | null;
  } | null;
  workspace?: { publicId: string } | null;
}

/** Membro directo do projeto (após mudança de modelo Mai 2026). */
export interface IProjectMember {
  publicId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** MOMENTO REAL ISO. Usado por `avatarUrlOf` para cache busting `?v=...`. */
  avatarUpdatedAt: string | null;
  role: 'OWNER' | 'CONTRIBUTOR' | 'READER';
  userType?: { publicId: string; code: string; label: string } | null;
}
