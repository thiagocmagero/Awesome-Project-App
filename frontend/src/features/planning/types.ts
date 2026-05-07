// Re-export config types from useGanttConfig (used across planning feature)
export type {
  GanttConfigColors,
  GanttConfigBehavior,
  GanttConfigDefaults,
  GanttConfigData,
  CellPattern,
} from '../../hooks/useGanttConfig';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ProjectDetail {
  id: number;
  publicId: string;
  name: string;
  /** Formato de data exibido neste projecto (`null` ⇒ default platform-wide). */
  dateFormat: string | null;
  /**
   * Janela horária útil (24h) usada por tasks com `durationUnit = 'HOUR'`.
   * `null` ⇒ default 09:00–18:00. Ver docs/claude/tools/gantt/data-model.md.
   */
  workHours: { start: number; end: number } | null;
  teams: Array<{
    team: {
      id: number;
      publicId: string;
      name: string;
      members: Array<{
        isLead: boolean;
        user: {
          id: number; publicId: string; name: string; email: string; status: string;
          userType?: { id: number; publicId: string; code: string; label: string } | null;
        };
      }>;
    };
  }>;
}

/** Granularidade da `duration` da task. Espelha o enum Prisma. */
export type GanttTaskDurationUnit = 'DAY' | 'HOUR';

export interface GanttTask {
  id: number;
  publicId: string;
  text: string;
  type: string;
  start_date: string;
  end_date?: string;
  /**
   * Duração em dias úteis (DAY) ou horas úteis (HOUR), conforme `durationUnit`.
   * Em HOUR aceita decimais (0.25 = 15min). Milestone deve ser 0.
   */
  duration: number;
  /**
   * Default `'DAY'` (retrocompat). Tasks novas com hora exacta são `'HOUR'`.
   * Ver docs/claude/tools/gantt/data-model.md.
   */
  durationUnit?: GanttTaskDurationUnit;
  progress: number;
  owner_id: string[];
  parent: number;
  priority?: number;
  constraint_type?: string;
  constraint_date?: string;
  /** publicId do BoardColumn onde a tarefa está — fonte única de estado */
  boardColumn: string | null;
  /** publicId da BoardSwimlane onde a tarefa está — null = sem swimlane */
  boardSwimlane: string | null;
  boardPosition: number | null;
  /** Número de comentários nesta tarefa (incluído na resposta do board). */
  commentCount?: number;
}

export interface GanttLink {
  id: string;
  publicId: string;
  source: number;
  target: number;
  type: string;
  lag: number;
}

export interface TeamMember {
  id: number;
  publicId: string;
  name: string;
  email: string;
  status: string;
  teamName: string;
  userTypeCode: string | null;
  userTypeLabel: string | null;
}

export interface ExternalResource {
  id: number;       // numeric id — used as DHTMLX resource id
  publicId: string;
  text: string;
  hoursPerDay: number;
  userType: { publicId: string; code: string; label: string };
}

export interface UserTypeLookup {
  publicId: string;
  code: string;
  label: string;
}

/** Nó da árvore de recursos do Gantt — vem do backend (GanttResourceNode).
 *  `id` e `parent` são `publicId` UUIDs do `GanttResourceNode`. `parent: null`
 *  indica nó raiz (grupo top-level). DHTMLX aceita string como id e usa-o
 *  para matching com `task.owner_id` (também publicId desde Maio 2026). */
export interface ResourceNode {
  id: string;
  text: string;
  parent: string | null;
  hoursPerDay: number;
  isGroup: boolean;
  /** URL pública (S3) do avatar do utilizador associado (se for folha com userId).
   *  null para grupos, recursos externos sem userId, ou utilizadores sem avatar. */
  avatarUrl: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const TASK_TYPES = [
  { value: 'task' },
  { value: 'project' },
  { value: 'milestone' },
];

export const PRIORITY_OPTIONS = [
  { value: '' },
  { value: '0' },
  { value: '1' },
  { value: '2' },
  { value: '3' },
];

export const CONSTRAINT_OPTIONS = [
  { value: '' },
  { value: 'asap' },
  { value: 'alap' },
  { value: 'snet' },
  { value: 'snlt' },
  { value: 'fnet' },
  { value: 'fnlt' },
  { value: 'mso' },
  { value: 'mfo' },
];

export const LINK_TYPES = [
  { value: '0' },
  { value: '1' },
  { value: '2' },
  { value: '3' },
];

export const CONSTRAINT_NEEDS_DATE = new Set(['snet', 'snlt', 'fnet', 'fnlt', 'mso', 'mfo']);

export const EMPTY_TASK_FORM = {
  text: '',
  type: 'task',
  start_date: '',
  duration: '1',
  /**
   * Default 'DAY' (retrocompat). User pode alternar para 'HOUR' via switch
   * "Definir hora exacta" no TaskModal. Em HOUR, `duration` representa horas.
   */
  durationUnit: 'DAY' as 'DAY' | 'HOUR',
  progress: '0',
  parent: '0',
  priority: '',
  constraint_type: '',
  constraint_date: '',
  /** publicId do estado (coluna do board) onde a tarefa está */
  boardColumn: '',
  /** publicId da tarefa pai — preenchido pelo board ao clicar "+ Add subtask" */
  parentPublicId: '',
};

export const EMPTY_LINK_FORM = { source: '', target: '', type: '0', lag: '0' };

export const ZOOM_LEVELS = [10, 18, 30, 50, 80]; // min_column_width em px
export const DEFAULT_ZOOM_INDEX = 2;
// Floor de zoom por granularidade do widget. Em vista DAY permite-se idx 0
// (33%). Em vista HOUR, com colunas hora-a-hora, ir abaixo de idx 1 (60%)
// torna o cabeçalho "DD MMM" da escala superior ilegível e amontoa a hora.
export const MIN_ZOOM_INDEX_DAY  = 0;
export const MIN_ZOOM_INDEX_HOUR = 1;
export function getMinZoomIndex(unit: 'day' | 'hour'): number {
  return unit === 'hour' ? MIN_ZOOM_INDEX_HOUR : MIN_ZOOM_INDEX_DAY;
}

export const AVATAR_COLORS = [
  'bg-primary', 'bg-secondary', 'bg-success', 'bg-warning', 'bg-info', 'bg-danger',
];

/** Cores DHTMLX padrão — usadas no picker quando o utilizador ainda não configurou */
export const DEFAULT_COLORS = {
  taskBar:        '#3db9d3',
  taskBarProject: '#65c16f',
  milestone:      '#e84e4e',
  links:          '#9db9d3',
  todayMarker:    '#ff4040',
} as const;

export const COLOR_FIELDS: { key: keyof import('../../hooks/useGanttConfig').GanttConfigColors }[] = [
  { key: 'taskBar' },
  { key: 'taskBarProject' },
  { key: 'milestone' },
  { key: 'links' },
  { key: 'todayMarker' },
];

export type ShowToastFn = (variant: import('../../contexts/ToastContext').ToastVariant, message: string) => void;
