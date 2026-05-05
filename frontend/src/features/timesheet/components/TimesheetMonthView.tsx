import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ITimesheetMonthBundle,
  ITimesheetMonthDay,
  ITimesheetMonthDayAggregate,
  ITimesheetMonthDayIndividual,
  TimesheetMonthMode,
} from '../types';

// FullCalendar carregado globalmente em AppLayout (`/assets/libs/fullcalendar/index.global.min.js`)
declare const FullCalendar: {
  Calendar: new (el: HTMLElement, opts: object) => {
    render(): void;
    destroy(): void;
    gotoDate(date: string | Date): void;
    /** Re-calcula tamanhos internos. Usado quando o container muda de
     *  `display:none` para visível — sem isto o calendário fica em branco
     *  porque a primeira render() correu contra um container 0×0. */
    updateSize(): void;
  };
};

interface Props {
  data:        ITimesheetMonthBundle;
  monthIso:    string;          // 'YYYY-MM'
  locale?:     string;
  /** Click num dia → drill-down para vista semanal (passa weekStart calculada). */
  onDayClick:  (dateIso: string) => void;
  /** Click numa célula da coluna SEMANA → drill-down para vista semanal. */
  onWeekClick: (weekStartIso: string) => void;
}

/**
 * TimesheetMonthView — vista mensal do gestor (FullCalendar dayGridMonth).
 *
 * Layout flexbox: FullCalendar à esquerda + coluna "SEMANA" à direita
 * (alinhada por flex stretch — ambas as colunas partilham o mesmo height).
 *
 * Conteúdo dinâmico das células é injectado via `dayCellDidMount` + um effect
 * de re-aplicação quando `data` muda. Cada célula recebe:
 *  - Classe de estado (`tsm-day--complete|partial|pending|future|weekend|out`)
 *  - Badge X/Y (modo agregado) ou ✓/✗ (modo individual)
 *  - Tooltip com utilizadores em falta (modo agregado)
 *
 * `validRange` no FullCalendar não é estritamente necessário (a navegação
 * mensal é gerida pelo toolbar), mas dias fora do projecto são marcados visualmente.
 */
export function TimesheetMonthView({ data, monthIso, locale = 'pt', onDayClick, onWeekClick }: Props) {
  const { t } = useTranslation('timesheet');

  const containerRef  = useRef<HTMLDivElement | null>(null);
  const calRef        = useRef<{ destroy(): void; gotoDate(d: string | Date): void; updateSize(): void } | null>(null);
  const initializedRef = useRef(false);

  // Stale-closure refs — handlers do FullCalendar capturam closure estática
  const dataRef       = useRef(data);
  const onDayClickRef = useRef(onDayClick);
  useEffect(() => { dataRef.current       = data;       }, [data]);
  useEffect(() => { onDayClickRef.current = onDayClick; }, [onDayClick]);

  // ── Bug fix: calendário em branco na 1ª visita ─────────────────────────────
  // O TimesheetView é mantido no DOM (display:none/block) entre tabs do
  // PlanningPage. Se o FullCalendar for inicializado com o container ainda
  // em `display:none` (size 0×0), `cal.render()` não cria a estrutura DOM
  // correctamente e nem `updateSize()` recupera depois — fica em branco até
  // o user fazer monthly→weekly→monthly (que destrói/recria o widget).
  //
  // Solução: **adiar o init até o container ter dimensão real**. Usa
  // ResizeObserver para detectar a transição 0×0 → W×H (acontece quando o
  // user clica no tab Timesheet). Só aí inicializa o FullCalendar.
  const [containerVisible, setContainerVisible] = useState(false);
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    // Verificação imediata — se já está visível no mount (ex.: navegou
    // monthly→weekly→monthly e voltou), inicializa sem esperar pelo observer.
    const initialRect = el.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      setContainerVisible(true);
      return; // não precisa de observer — já está visível
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerVisible(true);
          observer.disconnect(); // só precisamos de saber a 1ª transição
          return;
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Singleton init — só corre quando o container é visível ─────────────────
  useEffect(() => {
    if (!containerVisible) return;
    if (initializedRef.current) return;
    if (!containerRef.current) return;
    if (typeof FullCalendar === 'undefined') return;

    initializedRef.current = true;

    const cal = new FullCalendar.Calendar(containerRef.current, {
      initialView:    'dayGridMonth',
      initialDate:    `${monthIso}-01`,
      firstDay:       1,
      locale,
      headerToolbar:  false,
      height:         'auto',
      fixedWeekCount: true,
      showNonCurrentDates: true,
      weekends:       true,
      navLinks:       false,
      dayHeaderFormat: { weekday: 'short' },
      // Click num dia → drill-down (cancelado para dias outOfRange)
      dateClick(info: { dateStr: string }) {
        const day = dataRef.current.days.find((d) => d.date === info.dateStr);
        if (!day || day.outOfRange) return;
        onDayClickRef.current(info.dateStr);
      },
      // Aplica conteúdo + classe ao montar a célula
      dayCellDidMount(arg: { el: HTMLElement }) {
        const dateAttr = arg.el.getAttribute('data-date');
        if (!dateAttr) return;
        const day = dataRef.current.days.find((d) => d.date === dateAttr);
        if (day) applyCellState(arg.el, day, dataRef.current.mode);
      },
    });
    calRef.current = cal;
    cal.render();

    return () => {
      cal.destroy();
      calRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerVisible]);

  // Navegar quando muda o mês
  useEffect(() => {
    if (!calRef.current) return;
    calRef.current.gotoDate(`${monthIso}-01`);
  }, [monthIso]);

  // ResizeObserver de seguimento — depois do init, mantém o calendário
  // ajustado a mudanças subsequentes de tamanho (ex.: sidebar collapse,
  // browser resize). Só corre quando já há `calRef.current`.
  useEffect(() => {
    if (!containerVisible || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver(() => {
      calRef.current?.updateSize?.();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerVisible]);

  // Re-aplicar conteúdo das células quando muda data (modo agregado/individual,
  // refresh após mutação noutra view, etc.).
  useEffect(() => {
    if (!containerRef.current) return;
    for (const day of data.days) {
      const cell = containerRef.current.querySelector(`[data-date="${day.date}"]`) as HTMLElement | null;
      if (cell) applyCellState(cell, day, data.mode);
    }
  }, [data]);

  return (
    <div className="tsm-month">
      <div ref={containerRef} className="tsm-cal" />
      <div className="tsm-weeks" role="list">
        <div className="tsm-weeks__hd">{t('month.week_col')}</div>
        {data.weeks.map((w) => {
          const isInteractive = w.status !== 'out_of_range' && w.status !== 'mixed';
          return (
            <button
              key={w.weekStart}
              type="button"
              role="listitem"
              className={`tsm-weeks__cell tsm-weeks__cell--${w.status}${w.containsToday ? ' is-today' : ''}`}
              disabled={!isInteractive}
              onClick={() => isInteractive && onWeekClick(w.weekStart)}
              title={t(`month.week_status.${w.status}` as 'month.week_status.complete')}
            >
              <div className="tsm-weeks__num">
                {t('month.sem_n', { n: w.weekNumber })}
              </div>
              <div className="tsm-weeks__status">
                {t(`month.week_status.${w.status}` as 'month.week_status.complete')}
              </div>
              {isInteractive && (
                <div className="tsm-weeks__cta">{t('month.see_details')} →</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers DOM ───────────────────────────────────────────────────────────────

function applyCellState(cell: HTMLElement, day: ITimesheetMonthDay, mode: TimesheetMonthMode) {
  // Limpar conteúdo customizado anterior
  cell.querySelectorAll('.tsm-day__custom').forEach((n) => n.remove());
  cell.classList.remove(
    'tsm-day--complete', 'tsm-day--partial', 'tsm-day--pending',
    'tsm-day--future',   'tsm-day--weekend', 'tsm-day--out',
  );

  if (day.outOfRange) {
    cell.classList.add('tsm-day--out');
    cell.removeAttribute('title');
    return;
  }
  if (day.isWeekend) {
    cell.classList.add('tsm-day--weekend');
  } else if (day.isFuture) {
    cell.classList.add('tsm-day--future');
  } else if (mode === 'aggregate') {
    const d = day as ITimesheetMonthDayAggregate;
    if (d.totalCount > 0 && d.filledCount === d.totalCount) cell.classList.add('tsm-day--complete');
    else if (d.filledCount === 0) cell.classList.add('tsm-day--pending');
    else cell.classList.add('tsm-day--partial');
  } else {
    cell.classList.add(
      (day as ITimesheetMonthDayIndividual).filled ? 'tsm-day--complete' : 'tsm-day--pending',
    );
  }

  // Conteúdo customizado: badge X/Y ou ✓/✗
  const badge = document.createElement('div');
  badge.className = 'tsm-day__custom tsm-day__count';
  if (mode === 'aggregate') {
    const d = day as ITimesheetMonthDayAggregate;
    badge.textContent = `${d.filledCount}/${d.totalCount}`;
  } else {
    badge.textContent = (day as ITimesheetMonthDayIndividual).filled ? '✓' : '✗';
  }
  cell.appendChild(badge);

  // Tooltip com utilizadores em falta (modo agregado)
  if (mode === 'aggregate') {
    const d = day as ITimesheetMonthDayAggregate;
    if (d.missingUsers.length > 0 && d.missingUsers.length < d.totalCount) {
      const names = d.missingUsers.map((u) => u.name).join(', ');
      cell.title = `Faltam: ${names}`;
    } else {
      cell.removeAttribute('title');
    }
  }
}
