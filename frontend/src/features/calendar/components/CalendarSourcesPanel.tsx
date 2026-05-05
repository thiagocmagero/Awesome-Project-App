import { useTranslation } from 'react-i18next';
import type {
  CalendarConfigData,
  ICalendarEventType,
  ICalendarHolidayItem,
} from '../types';

interface Props {
  open: boolean;
  config: CalendarConfigData;
  eventTypes: ICalendarEventType[];
  /** Lista única de holidays (project-linked + user-owned, dedupados pelo backend) */
  holidays: ICalendarHolidayItem[];
  /** Patch parcial — actualiza CalendarConfig USER */
  onUpdateConfig: (patch: Partial<CalendarConfigData>) => void;
}

/** Chave i18n para o nome do tipo (sistema → labelKey, custom → name) */
function eventTypeLabel(t: ICalendarEventType, tCal: (k: string) => string): string {
  if (t.name && t.name.trim() !== '') return t.name;
  if (t.labelKey) return tCal(t.labelKey);
  return t.publicId.slice(0, 8);
}

export function CalendarSourcesPanel({
  open,
  config,
  eventTypes,
  holidays,
  onUpdateConfig,
}: Props) {
  const { t: tCal } = useTranslation('calendar');
  const sources = config.sources ?? {};
  const eventTypeVisibility = sources.eventTypes ?? {};
  const holidayVisibility   = sources.holidays   ?? {};

  if (!open) return null;

  const setSource = (key: 'project' | 'tasks' | 'milestones', value: boolean) => {
    onUpdateConfig({ sources: { ...sources, [key]: value } });
  };
  const setEventTypeVisible = (typePublicId: string, value: boolean) => {
    onUpdateConfig({
      sources: {
        ...sources,
        eventTypes: { ...eventTypeVisibility, [typePublicId]: value },
      },
    });
  };
  const setHolidayVisible = (holidayPublicId: string, value: boolean) => {
    onUpdateConfig({
      sources: {
        ...sources,
        holidays: { ...holidayVisibility, [holidayPublicId]: value },
      },
    });
  };

  return (
    // Padrão visual alinhado com `ts-aside` do Timesheet (card branco com
    // border + radius, secções com label JetBrains Mono uppercase). Sem título
    // global — labels de secção dão contexto suficiente.
    <aside className="calendar-sources-panel">
      {/* ── Calendários ──────────────────────────────────────────────────
          Lista única dedupada: holidays do utilizador (de /holidays) +
          holidays linkados ao projecto via ProjectHoliday. Toggle individual. */}
      <div className="csp-section">
        <div className="csp-section-header">{tCal('sources.section.project_calendars')}</div>
        {holidays.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 12, padding: '4px 10px' }}>
            {tCal('sources.no_calendars')}
          </div>
        ) : (
          holidays.map((h) => (
            <CalendarItemRow
              key={h.publicId}
              label={h.name}
              badge={h.isProjectLinked ? tCal('sources.badge.project') : null}
              checked={holidayVisibility[h.publicId] !== false}
              onChange={(v) => setHolidayVisible(h.publicId, v)}
            />
          ))
        )}
      </div>

      {/* ── Entidades do projecto (read-only) ─────────────────────────── */}
      <div className="csp-section">
        <div className="csp-section-header">{tCal('sources.section.project_entities')}</div>
        <SourceRow
          icon="ri-folder-2-line"
          iconColor="#a78bfa"
          label={tCal('sources.entity_project')}
          checked={sources.project ?? true}
          onChange={(v) => setSource('project', v)}
        />
        <SourceRow
          icon="ri-task-line"
          iconColor="#22c55e"
          label={tCal('sources.entity_tasks')}
          checked={sources.tasks ?? true}
          onChange={(v) => setSource('tasks', v)}
        />
        <SourceRow
          icon="ri-flag-line"
          iconColor="#f59e0b"
          label={tCal('sources.entity_milestones')}
          checked={sources.milestones ?? true}
          onChange={(v) => setSource('milestones', v)}
        />
        <p className="csp-readonly-notice">{tCal('sources.entities_readonly_notice')}</p>
      </div>

      {/* ── Tipos de evento ──────────────────────────────────────────── */}
      <div className="csp-section">
        <div className="csp-section-header">{tCal('sources.section.event_types')}</div>
        {eventTypes.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 12, padding: '4px 10px' }}>
            —
          </div>
        ) : (
          eventTypes.map((typ) => {
            const visible = eventTypeVisibility[typ.publicId];
            const checked = visible !== false; // default true
            return (
              <label key={typ.publicId} className="csp-event-type">
                <span className="csp-bullet" style={{ background: typ.color }} />
                <span className="csp-label">{eventTypeLabel(typ, tCal)}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setEventTypeVisible(typ.publicId, e.target.checked)}
                  style={{ accentColor: typ.color }}
                />
              </label>
            );
          })
        )}
      </div>
    </aside>
  );
}

// ── Internal: row genérica com toggle ────────────────────────────────────────
function SourceRow(props: {
  icon: string;
  iconColor: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="csp-row">
      <span className="csp-icon" style={{ color: props.iconColor }}>
        <i className={props.icon} />
      </span>
      <span className="csp-label">{props.label}</span>
      <label className="csp-switch">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
        />
        <span className="csp-slider" />
      </label>
    </div>
  );
}

// ── Internal: row para um calendário (holiday) com badge opcional ────────────
function CalendarItemRow(props: {
  label: string;
  badge: string | null;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="csp-row">
      <span className="csp-icon" style={{ color: '#1f2430' }}>
        <i className="ri-calendar-event-line" />
      </span>
      <span className="csp-label" title={props.label}>{props.label}</span>
      {props.badge && <span className="csp-badge">{props.badge}</span>}
      <label className="csp-switch">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
        />
        <span className="csp-slider" />
      </label>
    </div>
  );
}
