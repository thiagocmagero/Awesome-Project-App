/**
 * Project-level permission system — single source of truth.
 *
 * Every project-scoped write endpoint MUST use @RequireProjectPermission(action).
 * To add a new action: 1) add to ProjectAction  2) add to DEFAULT_PERMISSIONS
 * 3) add to ACTION_GROUPS  4) add i18n key  5) apply guard on endpoint.
 */

// ── Actions ──────────────────────────────────────────────────────────────────

export enum ProjectAction {
  // Projecto
  PROJECT_VIEW            = 'PROJECT_VIEW',
  PROJECT_UPDATE          = 'PROJECT_UPDATE',
  PROJECT_DELETE          = 'PROJECT_DELETE',

  // Membros
  MEMBER_INVITE           = 'MEMBER_INVITE',
  MEMBER_REMOVE           = 'MEMBER_REMOVE',
  MEMBER_CHANGE_ROLE      = 'MEMBER_CHANGE_ROLE',
  MEMBER_MANAGE_TEAMS     = 'MEMBER_MANAGE_TEAMS',

  // Permissões
  PERMISSIONS_MANAGE      = 'PERMISSIONS_MANAGE',

  // Planning — Tarefas
  TASK_CREATE             = 'TASK_CREATE',
  TASK_EDIT               = 'TASK_EDIT',
  TASK_DELETE             = 'TASK_DELETE',
  LINK_MANAGE             = 'LINK_MANAGE',
  TASK_COMMENT            = 'TASK_COMMENT',

  // Recursos
  RESOURCE_MANAGE         = 'RESOURCE_MANAGE',
  MEMBER_HOURS_MANAGE     = 'MEMBER_HOURS_MANAGE',
  HOLIDAY_MANAGE          = 'HOLIDAY_MANAGE',

  // Config
  GANTT_CONFIG            = 'GANTT_CONFIG',
  DATA_EXPORT             = 'DATA_EXPORT',

  // Estados (colunas do projecto). STATE_MANAGE controla CRUD de Estados +
  // Swimlanes via Planning ou Board.
  STATE_MANAGE            = 'STATE_MANAGE',

  // Board (Quadro Kanban) — reintroduzido com a nova UI AwesomeKanban.
  // BOARD_CARD_MOVE/BOARD_CARD_ASSIGN ficam subsumidos por TASK_EDIT
  // (decisão consciente do `future-board.md`).
  BOARD_VIEW              = 'BOARD_VIEW',
  BOARD_CONFIG            = 'BOARD_CONFIG',

  // Calendário
  CALENDAR_VIEW              = 'CALENDAR_VIEW',
  CALENDAR_EVENT_CREATE      = 'CALENDAR_EVENT_CREATE',
  CALENDAR_EVENT_EDIT        = 'CALENDAR_EVENT_EDIT',
  CALENDAR_EVENT_DELETE      = 'CALENDAR_EVENT_DELETE',
  CALENDAR_EVENT_TYPE_MANAGE = 'CALENDAR_EVENT_TYPE_MANAGE',
  CALENDAR_CONFIG            = 'CALENDAR_CONFIG',

  // Timesheet
  TIMESHEET_LOG     = 'TIMESHEET_LOG',
  TIMESHEET_APPROVE = 'TIMESHEET_APPROVE',
}

// ── Default permissions per role ─────────────────────────────────────────────
// OWNER and PLATFORM_ADMIN always have all permissions — not listed here.

export const DEFAULT_PERMISSIONS: Record<'CONTRIBUTOR' | 'READER', ProjectAction[]> = {
  CONTRIBUTOR: [
    ProjectAction.PROJECT_VIEW,
    ProjectAction.TASK_CREATE,
    ProjectAction.TASK_EDIT,
    ProjectAction.TASK_DELETE,
    ProjectAction.LINK_MANAGE,
    ProjectAction.TASK_COMMENT,
    ProjectAction.RESOURCE_MANAGE,
    ProjectAction.GANTT_CONFIG,
    ProjectAction.DATA_EXPORT,
    // Calendar
    ProjectAction.CALENDAR_VIEW,
    ProjectAction.CALENDAR_EVENT_CREATE,
    ProjectAction.CALENDAR_EVENT_EDIT,
    ProjectAction.CALENDAR_EVENT_DELETE,
    ProjectAction.CALENDAR_EVENT_TYPE_MANAGE,
    ProjectAction.CALENDAR_CONFIG,
    // Board — view + config (default Contributor; OWNER único bypass por perfil)
    ProjectAction.BOARD_VIEW,
    ProjectAction.BOARD_CONFIG,
    // Timesheet — log próprio (default Reader+/Contributor)
    ProjectAction.TIMESHEET_LOG,
  ],
  READER: [
    ProjectAction.PROJECT_VIEW,
    ProjectAction.TASK_COMMENT,
    ProjectAction.DATA_EXPORT,
    // Calendar — read-only (ver, sem criar/editar)
    ProjectAction.CALENDAR_VIEW,
    // Board — read-only (ver sem mover cards: TASK_EDIT continua a controlar drag)
    ProjectAction.BOARD_VIEW,
    // Timesheet — log próprio (Reader também lança as próprias horas, REQ-P03)
    ProjectAction.TIMESHEET_LOG,
  ],
};

// ── Delegatable actions ──────────────────────────────────────────────────────
// Only these can be granted/revoked by the owner via the UI.
// Non-delegatable actions (e.g. PROJECT_DELETE) are hardcoded to OWNER only.

export const DELEGATABLE_ACTIONS: ReadonlySet<ProjectAction> = new Set([
  ProjectAction.PERMISSIONS_MANAGE,
  ProjectAction.MEMBER_INVITE,
  ProjectAction.MEMBER_REMOVE,
  ProjectAction.MEMBER_CHANGE_ROLE,
  ProjectAction.MEMBER_MANAGE_TEAMS,
  ProjectAction.TASK_CREATE,
  ProjectAction.TASK_EDIT,
  ProjectAction.TASK_DELETE,
  ProjectAction.LINK_MANAGE,
  ProjectAction.RESOURCE_MANAGE,
  ProjectAction.MEMBER_HOURS_MANAGE,
  ProjectAction.HOLIDAY_MANAGE,
  ProjectAction.GANTT_CONFIG,
  // Estados (colunas do projecto)
  ProjectAction.STATE_MANAGE,
  // Calendário (excepto CALENDAR_VIEW que segue padrão de PROJECT_VIEW — sempre concedido)
  ProjectAction.CALENDAR_EVENT_CREATE,
  ProjectAction.CALENDAR_EVENT_EDIT,
  ProjectAction.CALENDAR_EVENT_DELETE,
  ProjectAction.CALENDAR_EVENT_TYPE_MANAGE,
  ProjectAction.CALENDAR_CONFIG,
  // Board (BOARD_VIEW segue padrão de PROJECT_VIEW — sempre concedido, não delegável)
  ProjectAction.BOARD_CONFIG,
  // Timesheet
  ProjectAction.TIMESHEET_LOG,
  ProjectAction.TIMESHEET_APPROVE,
]);

// ── UI grouping (accordion sections) ────────────────────────────────────────

export interface ActionGroup {
  key: string;
  labelKey: string; // i18n key in "permissions" namespace
  actions: ProjectAction[];
}

export const ACTION_GROUPS: ActionGroup[] = [
  {
    key: 'project',
    labelKey: 'group.project',
    actions: [ProjectAction.PROJECT_VIEW, ProjectAction.PROJECT_UPDATE, ProjectAction.PROJECT_DELETE],
  },
  {
    key: 'members',
    labelKey: 'group.members',
    actions: [
      ProjectAction.MEMBER_INVITE, ProjectAction.MEMBER_REMOVE,
      ProjectAction.MEMBER_CHANGE_ROLE, ProjectAction.MEMBER_MANAGE_TEAMS,
      ProjectAction.PERMISSIONS_MANAGE,
    ],
  },
  {
    key: 'tasks',
    labelKey: 'group.tasks',
    actions: [
      ProjectAction.TASK_CREATE, ProjectAction.TASK_EDIT, ProjectAction.TASK_DELETE,
      ProjectAction.LINK_MANAGE, ProjectAction.TASK_COMMENT,
    ],
  },
  {
    key: 'resources',
    labelKey: 'group.resources',
    actions: [ProjectAction.RESOURCE_MANAGE, ProjectAction.MEMBER_HOURS_MANAGE, ProjectAction.HOLIDAY_MANAGE],
  },
  {
    key: 'config',
    labelKey: 'group.config',
    actions: [ProjectAction.GANTT_CONFIG, ProjectAction.DATA_EXPORT],
  },
  {
    key: 'states',
    labelKey: 'group.states',
    actions: [ProjectAction.STATE_MANAGE],
  },
  {
    key: 'board',
    labelKey: 'group.board',
    actions: [ProjectAction.BOARD_VIEW, ProjectAction.BOARD_CONFIG],
  },
  {
    key: 'calendar',
    labelKey: 'group.calendar',
    actions: [
      ProjectAction.CALENDAR_VIEW,
      ProjectAction.CALENDAR_EVENT_CREATE,
      ProjectAction.CALENDAR_EVENT_EDIT,
      ProjectAction.CALENDAR_EVENT_DELETE,
      ProjectAction.CALENDAR_EVENT_TYPE_MANAGE,
      ProjectAction.CALENDAR_CONFIG,
    ],
  },
  {
    key: 'timesheet',
    labelKey: 'group.timesheet',
    actions: [
      ProjectAction.TIMESHEET_LOG,
      ProjectAction.TIMESHEET_APPROVE,
    ],
  },
];
