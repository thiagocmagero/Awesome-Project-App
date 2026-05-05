// Hook: singleton FullCalendar widget — init 1× per session, refresh via setOption.
import { useEffect, useRef, type MutableRefObject } from 'react';
import type { TFunction } from 'i18next';
import type {
  CalendarConfigData,
  CalendarView,
  FullCalendarApi,
  ICalendarBundle,
} from './types';

interface UseCalendarInitArgs {
  /** Container ref onde o FullCalendar é montado (sempre no DOM com display:none) */
  containerRef: MutableRefObject<HTMLDivElement | null>;
  /** Singleton ref — true após o primeiro init bem-sucedido */
  initializedRef: MutableRefObject<boolean>;
  /** Instância actual do FullCalendar (para chamadas externas) */
  instanceRef: MutableRefObject<FullCalendarApi | null>;
  /** Tab activo — só inicializamos quando o tab de calendário está visível */
  pageTab: string;
  /** Feature flag + permissão resolvidos — abortar init se faltar */
  showCalendar: boolean;
  /** Aguardar fim do permLoading antes de instanciar */
  permLoading: boolean;
  /** Bundle de dados do backend (eventos + sources read-only) */
  data: ICalendarBundle;
  /** Config 3-níveis (sources visibility + view + firstDay) */
  config: CalendarConfigData;
  /** Permissões granulares */
  canDoCreate: boolean;
  canDoEdit: boolean;
  /** i18n function (calendar namespace) */
  tCal: TFunction;
  /** Tradução comum para botões/labels */
  locale: string;
  /** Callbacks */
  onEventClick: (eventPublicId: string) => void;
  onTaskClick: (taskPublicId: string) => void;
  onSelect: (start: string, end: string, allDay: boolean) => void;
  onEventDrop: (eventPublicId: string, newStart: string, newEnd: string) => void;
  onEventResize: (eventPublicId: string, newStart: string, newEnd: string) => void;
  /** Refresh do título do header sempre que a vista muda */
  onDatesSet?: (title: string, viewType: string) => void;
}

/**
 * FullCalendar trata `end` como **exclusivo** em eventos all-day. Os utilizadores
 * preenchem (e o backend guarda) `endAt` como o último dia inclusivo, portanto
 * adicionamos +1 dia antes de passar ao widget para o último dia ser renderizado.
 *
 * Eventos com hora (allDay=false) não precisam — o `end` com timestamp explícito
 * é renderizado correctamente.
 */
function exclusiveAllDayEnd(endIso: string | null | undefined): string | undefined {
  if (!endIso) return undefined;
  const d = new Date(endIso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

/**
 * Inverso de `exclusiveAllDayEnd`: FullCalendar devolve `endStr` exclusivo nos
 * callbacks `select`/`eventDrop`/`eventResize` em modo all-day. O nosso backend
 * espera inclusivo (último dia visível ao utilizador), portanto subtraímos -1 dia.
 */
function inclusiveAllDayEnd(endIso: string): string {
  const d = new Date(endIso);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString();
}

/**
 * Constrói os arrays `eventSources` do FullCalendar a partir do bundle + config.
 * Cada source tem um `id` único e `extendedProps.source` para identificar a categoria.
 */
function buildEventSources(
  data: ICalendarBundle,
  config: CalendarConfigData,
  eventTypeColors: Record<string, string>,
) {
  const sources = config.sources ?? {};
  const eventTypeVisible = sources.eventTypes ?? {};

  const result: Array<{
    id: string;
    events: Array<{
      id: string;
      title: string;
      start: string;
      end?: string;
      allDay?: boolean;
      backgroundColor?: string;
      borderColor?: string;
      classNames?: string[];
      extendedProps: Record<string, unknown>;
    }>;
  }> = [];

  // 1) Custom calendar events (escrita)
  const eventsVisible = data.events.filter((ev) => {
    const visible = eventTypeVisible[ev.typePublicId];
    return visible !== false; // default true
  });
  if (eventsVisible.length > 0) {
    result.push({
      id: 'cal-events',
      events: eventsVisible.map((ev) => ({
        id: ev.publicId,
        title: ev.title,
        start: ev.startAt,
        // Eventos all-day: backend guarda end inclusivo; FullCalendar exige exclusivo → +1 dia.
        end: ev.allDay ? exclusiveAllDayEnd(ev.endAt) : ev.endAt,
        allDay: ev.allDay,
        backgroundColor: ev.color ?? eventTypeColors[ev.typePublicId] ?? '#845adf',
        borderColor:     ev.color ?? eventTypeColors[ev.typePublicId] ?? '#845adf',
        classNames: ['cal-source-event'],
        extendedProps: {
          source:       'event',
          typePublicId: ev.typePublicId,
          description:  ev.description,
          readonly:     false,
        },
      })),
    });
  }

  // 2) Tasks (read-only)
  if (sources.tasks ?? true) {
    const tasksVisible = data.tasks.filter((t) => !t.isMilestone && t.startDate);
    if (tasksVisible.length > 0) {
      result.push({
        id: 'cal-tasks',
        events: tasksVisible.map((t) => ({
          id: `task-${t.publicId}`,
          title: t.text,
          start: t.startDate!,
          end: t.endDate ?? undefined,
          allDay: true,
          classNames: ['cal-source-task', 'cal-readonly'],
          extendedProps: { source: 'task', taskPublicId: t.publicId, readonly: true },
        })),
      });
    }
  }

  // 3) Milestones (read-only)
  if (sources.milestones ?? true) {
    const milestonesVisible = data.tasks.filter((t) => t.isMilestone && t.startDate);
    if (milestonesVisible.length > 0) {
      result.push({
        id: 'cal-milestones',
        events: milestonesVisible.map((t) => ({
          id: `milestone-${t.publicId}`,
          title: `◆ ${t.text}`,
          start: t.startDate!,
          allDay: true,
          classNames: ['cal-source-milestone', 'cal-readonly'],
          extendedProps: { source: 'milestone', taskPublicId: t.publicId, readonly: true },
        })),
      });
    }
  }

  // 4) Project span (read-only)
  if ((sources.project ?? true) && data.project?.startDate) {
    result.push({
      id: 'cal-project',
      events: [
        {
          id: `project-${data.project.publicId}`,
          title: data.project.name,
          start: data.project.startDate,
          // Span do projecto é all-day → endDate inclusivo → +1 dia para FullCalendar.
          end: exclusiveAllDayEnd(data.project.endDate),
          allDay: true,
          classNames: ['cal-source-project', 'cal-readonly'],
          extendedProps: { source: 'project', readonly: true },
        },
      ],
    });
  }

  // 5) Holidays — lista única (linkados ao projecto + owned pelo user, dedupados)
  // Toggle individual por holidayPublicId. Default true para qualquer holiday ausente da config.
  const holidayVisibility = sources.holidays ?? {};
  for (const h of data.holidays) {
    if (holidayVisibility[h.publicId] === false) continue;
    if (h.dates.length === 0) continue;
    const scopeKey = h.scope.toLowerCase();
    result.push({
      id: `cal-holiday-${h.publicId}`,
      events: h.dates.map((d) => ({
        id: `holiday-${h.publicId}-${d.publicId}`,
        title: d.name || h.name,
        start: d.date,
        allDay: true,
        classNames: [`cal-source-holiday-${scopeKey}`, 'cal-readonly'],
        extendedProps: {
          source:          `holiday-${scopeKey}`,
          holidayPublicId: h.publicId,
          readonly:        true,
        },
      })),
    });
  }

  return result;
}

export function useCalendarInit(args: UseCalendarInitArgs): void {
  const {
    containerRef, initializedRef, instanceRef, pageTab, showCalendar, permLoading,
    data, config, canDoCreate, canDoEdit, tCal, locale,
    onEventClick, onTaskClick, onSelect, onEventDrop, onEventResize, onDatesSet,
  } = args;

  // Stale-closure refs — handlers do FullCalendar capturam closure estática
  const dataRef          = useRef(data);
  const configRef        = useRef(config);
  const canDoCreateRef   = useRef(canDoCreate);
  const canDoEditRef     = useRef(canDoEdit);
  const onEventClickRef  = useRef(onEventClick);
  const onTaskClickRef   = useRef(onTaskClick);
  const onSelectRef      = useRef(onSelect);
  const onEventDropRef   = useRef(onEventDrop);
  const onEventResizeRef = useRef(onEventResize);
  const onDatesSetRef    = useRef(onDatesSet);
  const tCalRef          = useRef(tCal);

  useEffect(() => { dataRef.current          = data;          }, [data]);
  useEffect(() => { configRef.current        = config;        }, [config]);
  useEffect(() => { canDoCreateRef.current   = canDoCreate;   }, [canDoCreate]);
  useEffect(() => { canDoEditRef.current     = canDoEdit;     }, [canDoEdit]);
  useEffect(() => { onEventClickRef.current  = onEventClick;  }, [onEventClick]);
  useEffect(() => { onTaskClickRef.current   = onTaskClick;   }, [onTaskClick]);
  useEffect(() => { onSelectRef.current      = onSelect;      }, [onSelect]);
  useEffect(() => { onEventDropRef.current   = onEventDrop;   }, [onEventDrop]);
  useEffect(() => { onEventResizeRef.current = onEventResize; }, [onEventResize]);
  useEffect(() => { onDatesSetRef.current    = onDatesSet;    }, [onDatesSet]);
  useEffect(() => { tCalRef.current          = tCal;          }, [tCal]);

  // ── Singleton init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showCalendar) return;
    if (pageTab !== 'calendar') return;
    if (permLoading) return;
    if (initializedRef.current) return;
    if (!containerRef.current) return;
    if (typeof FullCalendar === 'undefined') return;

    initializedRef.current = true;

    const colorMap: Record<string, string> = {};
    for (const t of dataRef.current.eventTypes) colorMap[t.publicId] = t.color;

    const cal = new FullCalendar.Calendar(containerRef.current, {
      initialView: configRef.current.view ?? 'dayGridMonth',
      firstDay:    configRef.current.firstDay ?? 1,
      locale,
      // Render-only — toolbar React substitui o built-in
      headerToolbar: false,
      height: 'auto',
      selectable: canDoCreateRef.current,
      editable:   canDoEditRef.current,
      dayMaxEvents: 4,
      navLinks: false,
      // Em vista mensal: dot + título (sem hora). Week/Day/List preservam hora.
      views: {
        dayGridMonth: { displayEventTime: false },
      },
      // Forçar 24h em todas as vistas — alinhado com a derivação automática de
      // datetime do projecto (`HH:mm` 24h). Sem isto, locales en-US mostram
      // "10:30 AM" enquanto os pickers escrevem "10:30".
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      eventSources: buildEventSources(dataRef.current, configRef.current, colorMap),
      // Buttons / texts (vide CSS escondendo header — texto fica disponível para list view)
      buttonText: {
        today: tCalRef.current('header.today'),
        month: tCalRef.current('view.month'),
        week:  tCalRef.current('view.week'),
        day:   tCalRef.current('view.day'),
        list:  tCalRef.current('view.list'),
      },
      noEventsContent: tCalRef.current('empty.no_events'),
      // ── Handlers ─────────────────────────────────────────────────────
      select(info: { startStr: string; endStr: string; allDay: boolean }) {
        if (!canDoCreateRef.current) return;
        // All-day: FullCalendar dá `endStr` exclusivo → converter para inclusivo.
        const endStr = info.allDay ? inclusiveAllDayEnd(info.endStr) : info.endStr;
        onSelectRef.current(info.startStr, endStr, info.allDay);
      },
      eventClick(info: { event: { id: string; extendedProps: Record<string, unknown> } }) {
        const src = info.event.extendedProps.source as string | undefined;
        if (src === 'event') {
          onEventClickRef.current(info.event.id);
        } else if (src === 'task' || src === 'milestone') {
          const tpid = info.event.extendedProps.taskPublicId as string | undefined;
          if (tpid) onTaskClickRef.current(tpid);
        }
        // holidays / project: sem acção (tooltip nativo dos titles)
      },
      eventAllow(_dropInfo: unknown, draggedEvent: { extendedProps: Record<string, unknown> } | null) {
        if (!draggedEvent) return false;
        if (draggedEvent.extendedProps?.readonly === true) return false;
        return canDoEditRef.current;
      },
      eventDrop(info: { event: { id: string; startStr: string; endStr: string; allDay: boolean }; revert: () => void }) {
        if (!canDoEditRef.current) { info.revert(); return; }
        const rawEnd = info.event.endStr || info.event.startStr;
        // All-day: converter o end exclusivo da FullCalendar para inclusivo do backend.
        const endStr = info.event.allDay ? inclusiveAllDayEnd(rawEnd) : rawEnd;
        onEventDropRef.current(info.event.id, info.event.startStr, endStr);
      },
      eventResize(info: { event: { id: string; startStr: string; endStr: string; allDay: boolean }; revert: () => void }) {
        if (!canDoEditRef.current) { info.revert(); return; }
        const rawEnd = info.event.endStr || info.event.startStr;
        const endStr = info.event.allDay ? inclusiveAllDayEnd(rawEnd) : rawEnd;
        onEventResizeRef.current(info.event.id, info.event.startStr, endStr);
      },
      datesSet(info: { view: { title: string; type: string } }) {
        onDatesSetRef.current?.(info.view.title, info.view.type);
      },
    });

    instanceRef.current = cal;
    cal.render();

    return () => {
      try { cal.destroy(); } catch { /* noop */ }
      instanceRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageTab, showCalendar, permLoading, locale]);

  // ── Refetch event sources when data or sources visibility changes ───────
  // chave derivada estabiliza o effect (o objecto data muda referência a cada fetch)
  const sourcesKey = JSON.stringify(config.sources ?? {});
  const dataKey = (() => {
    return [
      // Inclui propriedades renderizadas de cada evento — assim edições in-place
      // (mesmo length) também disparam o re-parse do widget.
      data.events
        .map((e) =>
          `${e.publicId}|${e.startAt}|${e.endAt}|${e.title}|${e.color ?? ''}|${e.typePublicId}|${e.allDay ? 1 : 0}`,
        )
        .join(';'),
      data.tasks.length,
      data.eventTypes.map((t) => `${t.publicId}|${t.color}`).join(','),
      data.holidays.map((h) => `${h.publicId}|${h.dates.length}`).join(','),
      data.project?.startDate ?? '', data.project?.endDate ?? '',
    ].join('::');
  })();

  useEffect(() => {
    if (!initializedRef.current || !instanceRef.current) return;
    const colorMap: Record<string, string> = {};
    for (const t of data.eventTypes) colorMap[t.publicId] = t.color;
    const newSources = buildEventSources(data, config, colorMap);
    instanceRef.current.removeAllEventSources();
    for (const src of newSources) instanceRef.current.addEventSource(src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey, dataKey]);

  // ── Reactive permissions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!initializedRef.current || !instanceRef.current) return;
    instanceRef.current.setOption('selectable', canDoCreate);
    instanceRef.current.setOption('editable', canDoEdit);
  }, [canDoCreate, canDoEdit]);

  // ── Reactive view + firstDay ─────────────────────────────────────────────
  useEffect(() => {
    if (!initializedRef.current || !instanceRef.current) return;
    if (config.view) instanceRef.current.changeView(config.view as CalendarView);
  }, [config.view]);

  useEffect(() => {
    if (!initializedRef.current || !instanceRef.current) return;
    if (typeof config.firstDay === 'number') {
      instanceRef.current.setOption('firstDay', config.firstDay);
    }
  }, [config.firstDay]);
}
