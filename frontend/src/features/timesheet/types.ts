/**
 * Timesheet — types frontend (mirror dos enums Prisma).
 */

export type TimesheetWeekStatus = 'DRAFT' | 'SUBMITTED' | 'PARTIAL' | 'APPROVED' | 'REJECTED';
export type TimesheetDayStatus  = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type TimesheetLogScope   = 'DAY' | 'WEEK' | 'MONTH';
export type TimesheetLogAction  = 'SUBMIT' | 'RESUBMIT' | 'APPROVE' | 'REJECT' | 'REVERT';

export type CopyWeekMode = 'TASKS_ONLY' | 'TASKS_HOURS' | 'TASKS_HOURS_COMMENTS';

export interface ITimesheetWeekSummary {
  publicId:    string;
  weekStart:   string;            // 'YYYY-MM-DD'
  status:      TimesheetWeekStatus;
  submittedAt: string | null;     // ISO datetime
}

export interface ITimesheetDay {
  publicId:        string;
  workDate:        string;        // 'YYYY-MM-DD'
  status:          TimesheetDayStatus;
  approvedAt:      string | null;
  approvedBy:      { publicId: string; name: string } | null;
  rejectedAt:      string | null;
  rejectedBy:      { publicId: string; name: string } | null;
  rejectionReason: string | null;
}

export interface ITimesheetEntry {
  publicId:     string;
  taskPublicId: string;
  taskText:     string;
  workDate:     string;          // 'YYYY-MM-DD'
  hours:        number;          // 0.10 .. 999.99
  comment:      string | null;
}

export interface ITimesheetTaskOption {
  publicId:    string;
  text:        string;
  projectName: string;
}

export interface ITimesheetMember {
  publicId: string;
  name:     string;
  isSelf:   boolean;
}

export interface ITimesheetBundle {
  week:    ITimesheetWeekSummary;
  days:    ITimesheetDay[];
  entries: ITimesheetEntry[];
  tasks:   ITimesheetTaskOption[];
  member:  ITimesheetMember | null;
}

export interface ITimesheetTeamRow {
  user: {
    publicId: string;
    name:     string;
    initials: string;
  };
  weekStart:    string;
  status:       TimesheetWeekStatus;
  totalHours:   number;
  weekPublicId: string | null;
}

export interface ITimesheetTeamData {
  rows:   ITimesheetTeamRow[];
  counts: {
    all:        number;
    SUBMITTED:  number;
    APPROVED:   number;
    REJECTED:   number;
    PARTIAL:    number;
    DRAFT:      number;
  };
}

export interface ITimesheetMyRow {
  weekPublicId: string;
  project:      { publicId: string; name: string };
  weekStart:    string;
  status:       TimesheetWeekStatus;
  submittedAt:  string | null;
  totalHours:   number;
}

export interface ITimesheetApprovalRow {
  weekPublicId: string;
  project:      { publicId: string; name: string };
  user:         { publicId: string; name: string; initials: string };
  weekStart:    string;
  status:       TimesheetWeekStatus;
  totalHours:   number;
}

export interface ITimesheetLogRow {
  publicId:  string;
  action:    TimesheetLogAction;
  scope:     TimesheetLogScope;
  scopeDate: string;
  reason:    string | null;
  createdAt: string;
  actor:     { publicId: string; name: string };
  target:    { publicId: string; name: string };
  weekStart: string;
}

// ── Vista mensal (Abril 2026) ───────────────────────────────────────────────

export type TimesheetMonthMode = 'aggregate' | 'individual';

export interface ITimesheetMonthDayAggregate {
  date:          string;     // 'YYYY-MM-DD'
  inMonth:       boolean;
  isWeekend:     boolean;
  isFuture:      boolean;
  outOfRange:    boolean;
  filledCount:   number;
  totalCount:    number;
  missingUsers:  Array<{ publicId: string; name: string; initials: string }>;
}

export interface ITimesheetMonthDayIndividual {
  date:        string;
  inMonth:     boolean;
  isWeekend:   boolean;
  isFuture:    boolean;
  outOfRange:  boolean;
  filled:      boolean;
}

export type ITimesheetMonthDay = ITimesheetMonthDayAggregate | ITimesheetMonthDayIndividual;

export interface ITimesheetMonthWeek {
  weekStart:      string;
  weekNumber:     number;
  status:         'complete' | 'partial' | 'pending' | 'future' | 'out_of_range' | 'mixed';
  containsToday:  boolean;
}

export interface ITimesheetMonthBundle {
  project: {
    publicId:   string;
    startDate:  string | null;
    endDate:    string | null;
  };
  month:        string;       // 'YYYY-MM'
  visibleStart: string;       // 'YYYY-MM-DD' — segunda-feira da 1ª linha
  mode:         TimesheetMonthMode;
  members:      Array<{ publicId: string; name: string; initials: string }>;
  days:         ITimesheetMonthDay[];        // 42 dias (6 semanas)
  weeks:        ITimesheetMonthWeek[];       // 6 semanas
  /**
   * Total de horas lançadas no PROJECTO (todos os entries, sem restrição
   * temporal):
   *  - Modo aggregate: soma de toda a equipa.
   *  - Modo individual: soma do user seleccionado.
   * Renderizado no card de resumo no topo da vista mensal.
   */
  totalHours:   number;
}
