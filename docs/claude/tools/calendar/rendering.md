# Claude: carregar para tarefas de layout e rendering do Calendar

## Layout — sources panel + main grid

```tsx
<div className="calendar-layout" style={{ display: pageTab === 'calendar' ? 'flex' : 'none' }}>
  <CalendarSourcesPanel
    open={showCalendarSources}
    config={calendarConfig}
    eventTypes={calendarData.data.eventTypes}
    holidays={calendarData.data.holidays}
    onUpdateConfig={(patch) => updateCalendarUserConfig(patch)}
  />
  <div className="calendar-main">
    <CalendarHeader
      instance={calendarInstanceRef.current}
      title={calendarTitle}
      view={calendarView}
      onChangeView={(v) => { setCalendarView(v); calendarInstanceRef.current?.changeView(v); updateUserConfig({ view: v }); }}
    />
    <div ref={calendarContainerRef} id="fullcalendar_here" className="calendar-zynix" />
  </div>
</div>
```

> **display:none** (não desmontar). O wrapper `.calendar-layout` é `flex`; quando
> escondido fica `display: none`. O container `#fullcalendar_here` permanece no DOM
> após o primeiro init para não recriar o widget.

## Toolbar nativa desactivada — header customizado

```typescript
new FullCalendar.Calendar(container, {
  headerToolbar: false,   // ← essencial
  // ...
});
```

CSS força a ocultação como defense-in-depth:
```css
.calendar-zynix .fc-header-toolbar { display: none; }
```

`<CalendarHeader>` React renderiza `< > Hoje | título | Mês/Semana/Dia/Lista`.
A instância FullCalendar é exposta via `calendarInstanceRef` para que os botões
`<` `>` `Hoje` chamem `instance.prev()` / `instance.next()` / `instance.today()`.

## Sources panel (sidebar)

3 secções, todas com toggles persistidos em `CalendarConfig USER`:

| Secção | Items | Mapeamento data |
|---|---|---|
| `CALENDÁRIOS` | Lista dinâmica `holidays.map(h => CalendarItemRow)` com toggle individual + badge "Projeto" para `isProjectLinked=true` | `data.holidays` — array dedupado pelo backend que une holidays linkados ao projecto (`ProjectHoliday`) e holidays owned pelo utilizador (`Holiday.ownerId = user.id`). Toggle persistido em `sources.holidays[publicId]` (default true) |
| `ENTIDADES DO PROJETO` (disclaimer único `sources.entities_readonly_notice` no fim da secção) | Projeto, Tarefas, Milestones | `project.startDate/endDate` · `tasks.filter(!isMilestone)` · `tasks.filter(isMilestone)` |
| `TIPOS DE EVENTO` | Lista dinâmica de `CalendarEventType` com bullet colorido | Toggle controla visibilidade de eventos com esse `typeId` (default true se chave omitida) |

A engrenagem (cogwheel) que abre o offcanvas `CalendarEventTypesPanel` vive na
**toolbar Row 2** (semelhante ao gear do Gantt e Board), gated por
`CALENDAR_EVENT_TYPE_MANAGE`. As secções do painel não têm engrenagem —
para gerir calendários, o utilizador vai a `/holidays` ou a
`/projects/:id/holidays`.

> **Empty state** da secção `CALENDÁRIOS`: quando `data.holidays.length === 0`
> (utilizador sem holidays próprios e projecto sem ProjectHoliday linkados)
> mostra `tCal('sources.no_calendars')`.

## buildEventSources — mapeamento bundle → FullCalendar

Função pura em `useCalendarInit.ts`:

```typescript
function buildEventSources(data, config, eventTypeColors) {
  const sources = config.sources ?? {};
  const eventTypeVisible = sources.eventTypes ?? {};
  const holidayVisible   = sources.holidays   ?? {};
  const result = [];

  // 1) Custom events (escrita) — filtrados por eventTypeVisible[typePublicId].
  //    Para allDay=true: end passa por exclusiveAllDayEnd(endAt) — backend guarda
  //    inclusivo, FullCalendar precisa exclusivo.
  // 2) Tasks read-only (cinza, classes 'cal-source-task cal-readonly').
  //    end = t.endDate (já exclusivo via convenção Gantt: start + duration).
  // 3) Milestones read-only (âmbar, '◆ {text}') — sem end.
  // 4) Project span (lavanda) — endDate inclusivo do backend, passa por
  //    exclusiveAllDayEnd antes de ir ao widget.
  // 5) Holidays — 1 source por holiday em data.holidays, filtrado por
  //    holidayVisible[h.publicId] !== false (default true).
  //    Classe CSS `.cal-source-holiday-${h.scope.toLowerCase()}` (global/regional/
  //    project/custom) preserva cor por scope mesmo no novo schema.

  return result;
}
```

Cada source tem `id` único (`'cal-events'`, `'cal-tasks'`, ..., `'cal-holiday-global'`)
para permitir add/remove granular se for preciso no futuro.

## Cores e classes dos eventos

- **Custom events**: `backgroundColor` = `event.color` (override) → `eventTypeColors[typePublicId]` → `#845adf`.
- **Read-only sources**: classes CSS aplicadas via `classNames`:
  - `cal-source-task` (cinza claro)
  - `cal-source-milestone` (âmbar)
  - `cal-source-project` (lavanda)
  - `cal-source-holiday-{global|regional|project|custom}` (vermelho claro — todos)
  - `cal-readonly` (transversal — opacidade + cursor: default)

CSS em `frontend/public/assets/css/calendar-zynix.css`.

## extendedProps — fonte de identificação

Cada evento carrega `extendedProps.source` para que `eventClick` decida o que abrir:

| `source` | `eventClick` action |
|---|---|
| `'event'` | Abrir `CalendarEventModal` (edit) com `event.id` (= publicId) |
| `'task'` ou `'milestone'` | Abrir `TaskModal` do Planning via `extendedProps.taskPublicId` |
| `'project'` | Sem acção (tooltip nativo do título) |
| `'holiday-{bucket}'` | Sem acção (tooltip nativo do título) |

`extendedProps.readonly: true` em tasks/milestones/project/holidays para o
`eventAllow` bloquear DnD.

## Modal de evento — FlatPickr

`CalendarEventModal` usa FlatPickr para os campos `startAt`/`endAt`:

```tsx
useEffect(() => {
  if (!open) return;
  const fpStart = flatpickr(startInputRef.current!, {
    enableTime: !allDay,
    dateFormat: allDay ? 'd-m-Y' : 'd-m-Y H:i',
    time_24hr: true,
    defaultDate: startAt || null,
    onChange: ([date]) => date && setStartAt(date.toISOString()),
  });
  // ... fpEnd ...
  return () => fpStart?.destroy();
}, [open, allDay]);
```

> `allDay` toggle reinicializa o FlatPickr (dep do effect) — isto altera
> `enableTime` e `dateFormat`.

## Offcanvas de tipos de evento — edição inline

`CalendarEventTypesPanel` é um **offcanvas Bootstrap** (lado direito), aberto
pela engrenagem da toolbar Row 2 — mesmo padrão do `BoardConfigPanel` e do
config offcanvas do Gantt (`useBootstrapOffcanvas`). Lista todos os tipos com
edição inline (color picker + input nome). Tipos sistema têm:
- Badge "Sistema" não-eliminável
- Input nome com placeholder `event_type.form.system_name_hint`
- Vazio → `update` envia `name: null` → backend repõe i18n via `systemKey`

> **Por ser offcanvas, não entra em `anyModalOpen`**: o overflow do body é
> gerido pelo próprio Bootstrap (`bootstrap.Offcanvas.show()`).

## CSS Zynix — overrides principais

`frontend/public/assets/css/calendar-zynix.css`:

```css
/* Container */
.calendar-zynix .fc { --fc-border-color: #e5e7eb; ... }

/* Day header (SEG, TER, ...) — uppercase tag */
.calendar-zynix .fc-col-header-cell-cushion { text-transform: uppercase; ... }

/* Today highlight no número */
.calendar-zynix .fc-day-today .fc-daygrid-day-number {
  background: #845adf; color: #fff; border-radius: 4px; ...
}

/* Events — pill style */
.calendar-zynix .fc-event { border: none; border-radius: 4px; ... }
.calendar-zynix .fc-daygrid-event-dot { display: none; }

/* Sources panel + header customizado */
.calendar-sources-panel { ... }
.calendar-zynix-header { ... }
```

## Anti-padrões

- ❌ Remover o container do DOM — usar `display:none` no wrapper `.calendar-layout`
- ❌ Activar `headerToolbar` nativo — duplica o `<CalendarHeader>` React
- ❌ Hardcodar cores no `buildEventSources` — usar `event.color → eventTypeColors[typeId]`
- ❌ Usar `extendedProps.source === 'task'` no `eventClick` sem fallback de tipo desconhecido
- ❌ Esquecer `cal-readonly` em sources read-only — o cursor fica `pointer` e parece editável

# Relacionados: @docs/claude/tools/calendar/overview.md @docs/claude/tools/calendar/interactions.md @docs/claude/frontend.md
