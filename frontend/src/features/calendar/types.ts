// Types & global namespace for the FullCalendar v6 Standard Bundle
// Loaded as a global script from /assets/libs/fullcalendar/index.global.min.js

// ── Global FullCalendar namespace (CDN/global build) ────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FullCalendarApi {
  render(): void;
  destroy(): void;
  next(): void;
  prev(): void;
  today(): void;
  changeView(viewName: string): void;
  getDate(): Date;
  view: { title: string; type: string };
  getOption(name: string): unknown;
  setOption(name: string, value: unknown): void;
  addEventSource(source: object): void;
  removeAllEventSources(): void;
  refetchEvents(): void;
  getEventById(id: string): { remove(): void } | null;
  on(eventName: string, handler: (...args: any[]) => void): void;
  off(eventName: string, handler?: (...args: any[]) => void): void;
  /** Força o FullCalendar a recalcular as suas dimensões (usar após resize do container). */
  updateSize(): void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

declare global {
  const FullCalendar: {
    Calendar: new (container: HTMLElement, config: object) => FullCalendarApi;
  };
}

// ── Backend payloads ─────────────────────────────────────────────────────────

export interface ICalendarEventType {
  publicId: string;
  systemKey: 'MANUAL' | 'MEETING' | 'REMINDER' | null;
  isSystem: boolean;
  /** Custom name (null + isSystem → use labelKey for i18n) */
  name: string | null;
  /** Hex color (e.g. "#845adf") */
  color: string;
  position: number;
  /** Computed: 'event_type.system.<key>' for sistema, null for custom */
  labelKey: string | null;
}

export interface ICalendarEvent {
  publicId: string;
  title: string;
  description: string | null;
  /** ISO 8601 UTC */
  startAt: string;
  /** ISO 8601 UTC */
  endAt: string;
  allDay: boolean;
  /** Override de cor (null = cor do tipo) */
  color: string | null;
  /** publicId do CalendarEventType */
  typePublicId: string;
  createdBy: { publicId: string; name: string } | null;
}

export interface ICalendarTask {
  publicId: string;
  text: string;
  type: string; // 'task' | 'milestone' | 'project'
  startDate: string | null;
  endDate: string | null;
  isMilestone: boolean;
}

export interface ICalendarHolidayDateItem {
  publicId: string;
  name: string;
  /** ISO 8601 — typically UTC midnight */
  date: string;
}

/**
 * Calendário (Holiday) que aparece na secção CALENDARS do sources panel.
 *
 * - `isOwned`         → o utilizador autenticado é dono (criado por ele em /holidays)
 * - `isProjectLinked` → o calendário está linkado ao projecto via ProjectHoliday
 *
 * Pelo menos uma das flags é sempre `true` (caso contrário o backend não inclui).
 * Se ambas forem `true`, o item aparece uma única vez (deduplicado por `publicId`).
 */
export interface ICalendarHolidayItem {
  publicId: string;
  name: string;
  scope: 'GLOBAL' | 'REGIONAL' | 'PROJECT' | 'CUSTOM';
  isOwned: boolean;
  isProjectLinked: boolean;
  dates: ICalendarHolidayDateItem[];
}

export interface ICalendarProjectInfo {
  publicId: string;
  name: string;
  startDate: string | null;
  endDate:   string | null;
}

export interface ICalendarBundle {
  events:     ICalendarEvent[];
  eventTypes: ICalendarEventType[];
  tasks:      ICalendarTask[];
  holidays:   ICalendarHolidayItem[];
  project:    ICalendarProjectInfo | null;
}

export interface ICalendarMember {
  id: string;    // User.publicId
  label: string; // User.name
}

// ── Config (3-level: GLOBAL < USER < PROJECT) ────────────────────────────────

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

export interface CalendarConfigSources {
  /** holidayPublicId → visible (default true para qualquer holiday não presente) */
  holidays?: Record<string, boolean>;
  project?: boolean;
  tasks?: boolean;
  milestones?: boolean;
  /** typePublicId → visible (default true para qualquer tipo) */
  eventTypes?: Record<string, boolean>;
}

export interface CalendarConfigData {
  sources?: CalendarConfigSources;
  view?: CalendarView;
  firstDay?: 0 | 1;
}

export const CALENDAR_CONFIG_DEFAULTS: Required<CalendarConfigData> = {
  sources: {
    holidays:   {},
    project:    true,
    tasks:      true,
    milestones: true,
    eventTypes: {},
  },
  view:     'dayGridMonth',
  firstDay: 1,
};

// ── Empty bundle helper ─────────────────────────────────────────────────────

export const EMPTY_CALENDAR_BUNDLE: ICalendarBundle = {
  events:     [],
  eventTypes: [],
  tasks:      [],
  holidays:   [],
  project:    null,
};
