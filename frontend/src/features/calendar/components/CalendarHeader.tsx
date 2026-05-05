import { useTranslation } from 'react-i18next';
import type { CalendarView, FullCalendarApi } from '../types';

interface Props {
  /** Instância actual do FullCalendar (para next/prev/today/changeView) */
  instance: FullCalendarApi | null;
  /** Título actual (ex: "abril de 2026") — vem do datesSet handler */
  title: string;
  /** Vista activa */
  view: CalendarView;
  /** Trigger para mudar a vista — actualiza CalendarConfig USER */
  onChangeView: (view: CalendarView) => void;
}

const VIEWS: Array<{ key: CalendarView; labelKey: string }> = [
  { key: 'dayGridMonth', labelKey: 'view.month' },
  { key: 'timeGridWeek', labelKey: 'view.week' },
  { key: 'timeGridDay',  labelKey: 'view.day' },
  { key: 'listWeek',     labelKey: 'view.list' },
];

export function CalendarHeader({ instance, title, view, onChangeView }: Props) {
  const { t: tCal } = useTranslation('calendar');

  return (
    <div className="calendar-zynix-header">
      <div className="czh-nav">
        <button type="button" onClick={() => instance?.prev()} aria-label="prev">
          <i className="ri-arrow-left-s-line" />
        </button>
        <button type="button" onClick={() => instance?.next()} aria-label="next">
          <i className="ri-arrow-right-s-line" />
        </button>
        <button type="button" className="czh-today" onClick={() => instance?.today()}>
          {tCal('header.today')}
        </button>
      </div>

      <div className="czh-title">{title}</div>

      <div className="czh-views">
        <span className="czh-views-label">{tCal('header.view_label')}</span>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`czh-view-btn${view === v.key ? ' is-active' : ''}`}
            onClick={() => onChangeView(v.key)}
          >
            {tCal(v.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
