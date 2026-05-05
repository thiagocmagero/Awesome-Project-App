# Claude: carregar para tarefas de eventos e interacções Calendar

## API FullCalendar v6 (relevante)

```typescript
const cal = new FullCalendar.Calendar(container, config);
cal.render();
cal.next() / cal.prev() / cal.today();      // navegação
cal.changeView('dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek');
cal.setOption(name, value);                 // mutação reactiva (selectable, editable, firstDay)
cal.removeAllEventSources();                // limpar eventos
cal.addEventSource({ id, events: [...] });  // adicionar source
cal.refetchEvents();                        // re-fetch sources com função
cal.destroy();                              // cleanup no return do useEffect
```

> **Não há `api.on/intercept` separado** como no DHTMLX Kanban. Tudo é callbacks
> no `config` passado ao construtor (`select`, `eventClick`, `eventDrop`, ...).

## Convenção crítica — `end` inclusivo no backend, exclusivo no widget

FullCalendar trata `end` como **exclusivo** em eventos all-day (drag de 31-03 a
03-04 → `endStr = "2025-04-04"`). O backend (`CalendarEvent.endAt`,
`Project.endDate`) guarda `end` como o **último dia inclusivo** que o utilizador
escolheu. Sem conversão, o último dia não é renderizado.

Helpers em `useCalendarInit.ts`:

```typescript
// Render: backend inclusivo → widget exclusivo (+1 dia)
function exclusiveAllDayEnd(endIso: string | null | undefined): string | undefined {
  if (!endIso) return undefined;
  const d = new Date(endIso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

// Callback: widget exclusivo → backend inclusivo (-1 dia)
function inclusiveAllDayEnd(endIso: string): string {
  const d = new Date(endIso);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString();
}
```

**Aplicação obrigatória:**
- Em `buildEventSources` para events com `allDay=true` e para o span do projecto.
- Nos callbacks `select`/`eventDrop`/`eventResize` quando `info.allDay === true`
  (ou `info.event.allDay`).

Tasks/milestones do Gantt **não** precisam — o `endDate` já é exclusivo por
convenção DHTMLX (`start + duration`). Holidays também não — cada `HolidayDate`
é um único dia sem `end`.

## Callbacks de eventos

```typescript
new FullCalendar.Calendar(container, {
  // Trigger ao seleccionar slot vazio (drag em dias)
  select(info) { /* { startStr, endStr, allDay } */ },

  // Click num evento
  eventClick(info) {
    /* info.event.id, info.event.extendedProps */
    const src = info.event.extendedProps.source as string;
    if (src === 'event') openEventModal(info.event.id);
    else if (src === 'task') openTaskModal(info.event.extendedProps.taskPublicId);
    // holidays/project: sem acção
  },

  // Validação antes de drag/drop — bloqueia events read-only
  eventAllow(_dropInfo, draggedEvent) {
    if (!draggedEvent) return false;
    if (draggedEvent.extendedProps?.readonly === true) return false;
    return canDoEditRef.current;
  },

  // Drag terminou — persistir nova data (com conversão exclusivo→inclusivo se all-day)
  eventDrop(info) {
    if (!canDoEditRef.current) { info.revert(); return; }
    const rawEnd = info.event.endStr || info.event.startStr;
    const endStr = info.event.allDay ? inclusiveAllDayEnd(rawEnd) : rawEnd;
    updateEvent(info.event.id, { startAt: info.event.startStr, endAt: endStr });
  },

  // Resize terminou — idêntico a eventDrop com a mesma conversão all-day
  eventResize(info) { /* ... */ },

  // Mudou de mês/semana ou view
  datesSet(info) { setTitle(info.view.title); setView(info.view.type); },
});
```

## Stale closures — padrão obrigatório

Os callbacks fazem closure estática sobre as variáveis no momento da construção.
Usar `useRef` para **tudo** que muda:

```typescript
const dataRef         = useRef(data);
const configRef       = useRef(config);
const canDoCreateRef  = useRef(canDoCreate);
const canDoEditRef    = useRef(canDoEdit);
const onEventClickRef = useRef(onEventClick);
// ... + useEffect para actualizar todos os refs

useEffect(() => { dataRef.current = data; }, [data]);
// ... etc
```

Dentro dos callbacks: `canDoCreateRef.current`, **nunca** `canDoCreate` directamente.

## Singleton pattern

```typescript
const calendarInitialized = useRef(false);
const calendarInstanceRef = useRef<FullCalendarApi | null>(null);

useEffect(() => {
  if (!showCalendar) return;
  if (pageTab !== 'calendar') return;
  if (permLoading) return;
  if (calendarInitialized.current) return;
  if (!containerRef.current) return;
  if (typeof FullCalendar === 'undefined') return; // script ainda a carregar

  calendarInitialized.current = true;
  const cal = new FullCalendar.Calendar(containerRef.current, { ... });
  calendarInstanceRef.current = cal;
  cal.render();

  return () => {
    try { cal.destroy(); } catch {}
    calendarInstanceRef.current = null;
    calendarInitialized.current = false;
  };
}, [pageTab, showCalendar, permLoading, locale]);
```

## Refresh de dados sem reinit (anti-pattern do `destroy`)

`destroy()` + recriar o widget quebra animações, scroll e selecção. Para
actualizar eventos quando `data` ou `config.sources` mudam:

```typescript
// chave derivada estabiliza o effect (objecto data muda referência a cada fetch)
const sourcesKey = JSON.stringify(config.sources ?? {});
const dataKey = `${data.events.length};${data.tasks.length};${typesHash};${holidaysCount}`;

useEffect(() => {
  if (!calendarInitialized.current || !calendarInstanceRef.current) return;
  const newSources = buildEventSources(data, config, colorMap);
  calendarInstanceRef.current.removeAllEventSources();
  for (const src of newSources) calendarInstanceRef.current.addEventSource(src);
}, [sourcesKey, dataKey]);
```

## Permissões reactivas

Quando `canDo` muda (resposta tardia do `/my-permissions`), actualizar via `setOption`:

```typescript
useEffect(() => {
  if (!calendarInitialized.current || !calendarInstanceRef.current) return;
  calendarInstanceRef.current.setOption('selectable', canDoCreate);
  calendarInstanceRef.current.setOption('editable',   canDoEdit);
}, [canDoCreate, canDoEdit]);
```

> Usar **boolean** como dep, não a função `canDo` (muda referência em cada render).

## Permissões — 3 camadas

**1 — Init config** (estado correcto desde o primeiro render):
```typescript
selectable: canDoCreateRef.current,
editable:   canDoEditRef.current,
```

**2 — Callbacks defensivos** (evita estado inconsistente em race condition):
```typescript
select(info) {
  if (!canDoCreateRef.current) return;
  onSelectRef.current(info.startStr, info.endStr, info.allDay);
}
```

**3 — `eventAllow` para bloquear DnD** em sources read-only:
```typescript
eventAllow(_dropInfo, draggedEvent) {
  if (draggedEvent?.extendedProps?.readonly === true) return false;
  return canDoEditRef.current;
}
```

**4 — UI: botões ocultos** no `UnifiedToolbar`:
```tsx
{canDo('CALENDAR_EVENT_CREATE') && <button>+ Novo Evento</button>}
{canDo('CALENDAR_EVENT_TYPE_MANAGE') && <button>Tipos de eventos</button>}
```

## Mudança de view + persistência

```typescript
function onChangeView(v: CalendarView) {
  setCalendarView(v);
  calendarInstanceRef.current?.changeView(v);
  updateUserConfig({ view: v });   // persiste no CalendarConfig USER
}
```

> `changeView` é imediato; `updateUserConfig` é async fire-and-forget. Em caso
> de falha de rede a próxima carga refará via `/calendar-config/resolve`.

## Sources visibility

Toggles do `CalendarSourcesPanel` actualizam `CalendarConfig USER`:

```typescript
function setSource(key: keyof Sources, value: boolean) {
  updateUserConfig({ sources: { ...sources, [key]: value } });
}
```

O `useEffect` reactivo da chave `sourcesKey` (acima) re-monta os sources do widget.

## Anti-padrões

- ❌ `destroy()` + recriar quando dados mudam — usar `removeAllEventSources` + `addEventSource`
- ❌ Estado React directamente em callbacks (`select`, `eventClick`, ...) — usar `useRef`
- ❌ `[canDo]` como dep do setOption effect — `canDo` muda em cada render, dispara loop
- ❌ Chamar `cal.render()` mais que uma vez por instância
- ❌ Esperar pelo `headerToolbar` nativo — está desactivado (`headerToolbar: false`); usar `<CalendarHeader>`
- ❌ `eventDrop` sem revert quando falta permissão — sempre `info.revert()` se cancelar
- ❌ Inicializar antes de `permLoading === false` — botões ficam visíveis "a flicker"
- ❌ Confiar no locale nativo do FullCalendar para textos — usar `t('calendar:...')` para todos os labels visíveis
- ❌ Passar `endAt` directamente entre backend e widget em eventos all-day —
  backend é inclusivo (último dia visível), widget é exclusivo (`end + 1 day`).
  Sem conversão (`exclusiveAllDayEnd`/`inclusiveAllDayEnd`) o último dia desaparece
  ou o evento "cresce" 1 dia em cada drag.

# Relacionados: @docs/claude/tools/calendar/overview.md @docs/claude/tools/calendar/rendering.md @docs/claude/frontend.md
