# Claude: carregar para qualquer tarefa do Calendário

## O que é

**FullCalendar v6.1.9** (MIT, em `frontend/public/assets/libs/fullcalendar/`).
Carregado globalmente em `AppLayout.tsx` via `loadScript`.
Página: `PlanningPage.tsx` — tab "Calendário" ao lado das tabs Planeamento, Gantt e Quadro.
Configuração platform-wide: `CalendarSettingsPage.tsx` (`/settings/calendar`).

> **Não é DHTMLX**: usa **callbacks em config** (não `api.on/intercept`).
> Eventos do widget: `select`, `eventClick`, `eventDrop`, `eventResize`, `datesSet`,
> `eventAllow`. Sem event bus separado para in/out.

## Feature flag

- Flag `calendar_view` controla acesso.
- `PLATFORM_ADMIN` bypassa sempre.
- Frontend: `useFeatureFlag('calendar_view')` + `user.profileCode === 'PLATFORM_ADMIN'`.
- Backend: `FeatureFlagGuard` + `@RequireFeature('calendar_view')` no `CalendarController`.

## Módulos backend

| Módulo | Responsabilidade |
|--------|-----------------|
| `CalendarModule` | Eventos, tipos de evento, agregado read-only — `src/calendar/` |
| `CalendarConfigModule` | Configuração 3 níveis (sources visibility, view, firstDay) — `src/calendar-config/` |

## Módulos frontend

| Ficheiro | Responsabilidade |
|----------|-----------------|
| `features/calendar/types.ts` | Tipos TypeScript + declaração global `FullCalendar` |
| `features/calendar/useCalendarData.ts` | Fetch bundle + mutações eventos/tipos |
| `features/calendar/useCalendarConfig.ts` | Config 3 níveis (GLOBAL → USER → PROJECT) |
| `features/calendar/useCalendarInit.ts` | Singleton FullCalendar + handlers select/eventClick/drop/resize |
| `features/calendar/components/CalendarSourcesPanel.tsx` | Sidebar "Fontes do Calendário" (3 secções com toggles) |
| `features/calendar/components/CalendarHeader.tsx` | Header customizado (< > Hoje · título · Mês/Semana/Dia/Lista) |
| `features/calendar/components/CalendarEventModal.tsx` | Modal criar/editar evento (FlatPickr) |
| `features/calendar/components/CalendarEventTypesPanel.tsx` | Offcanvas CRUD tipos custom + edição inline (gear da toolbar Row 2) |

## Permissões

| Acção | OWNER | CONTRIBUTOR | READER | Delegável |
|-------|:-----:|:-----------:|:------:|:---------:|
| `CALENDAR_VIEW` | ✓ | ✓ | ✓ | Não |
| `CALENDAR_EVENT_CREATE` | ✓ | ✓ | — | ✓ |
| `CALENDAR_EVENT_EDIT` | ✓ | ✓ | — | ✓ |
| `CALENDAR_EVENT_DELETE` | ✓ | ✓ | — | ✓ |
| `CALENDAR_EVENT_TYPE_MANAGE` | ✓ | ✓ | — | ✓ |
| `CALENDAR_CONFIG` | ✓ | ✓ | — | ✓ |

> **READER** consegue ver o calendário e abrir tooltips, mas o widget é
> instanciado com `selectable: false` e `editable: false`, e os botões
> "+ Novo Evento" e "Tipos de eventos" estão ocultos no toolbar (gated por
> `canDo` na `UnifiedToolbar`).

## Sources do calendário

A sidebar **"Fontes do Calendário"** (`CalendarSourcesPanel`) tem 3 secções com
toggles persistidos em `CalendarConfig` USER:

### 1. Calendários (read-only — origem em `Holiday`)
Lista única dedupada por `Holiday.publicId` que junta:
- **Calendários do utilizador** — todos os `Holiday` com `ownerId = currentUser.id`
  (mesma lista que `/holidays` mostra ao utilizador, scope normalmente `CUSTOM`).
- **Project Calendar** — todos os `Holiday` linkados via `ProjectHoliday` ao
  projecto actual (qualquer `ownerId`, qualquer `scope`).

Cada calendário tem **toggle individual** persistido em `CalendarConfig USER`
como `sources.holidays: Record<holidayPublicId, boolean>` (default `true` para
qualquer publicId não presente). Os linkados ao projecto mostram um badge
**"Projeto"** ao lado do nome para o utilizador distinguir os pessoais dos
partilhados com a equipa.

> **Nota (Abril 2026)**: holidays platform-level (`scope = GLOBAL`/`REGIONAL`)
> que **não** estão linkados ao projecto **e não são owned** pelo utilizador
> autenticado **não aparecem**. Para os tornar visíveis num projecto, é
> preciso linká-los explicitamente via `/projects/:id/holidays`. Comportamento
> anterior (todos os GLOBAL/REGIONAL visíveis em todos os projectos) foi
> substituído por esta UX mais explícita.

### 2. Entidades do Projeto (read-only — origem em `Project`/`Task`)
- **Projeto** — `Project.startDate`/`endDate` como evento span
- **Tarefas** — `Task.type='task'` (drag bloqueado por `eventAllow`)
- **Milestones** — `Task.type='milestone'` ou `duration=0`

### 3. Tipos de Evento (escrita — origem em `CalendarEventType`)
- 3 tipos sistema lazy-init: `MANUAL`, `MEETING`, `REMINDER`
- Tipos custom criados pelo utilizador (`isSystem=false`)
- Toggle por tipo controla visibilidade dos eventos com esse `typeId`

## Regras críticas

- **Singleton**: `calendarInitialized.current` ref — init apenas 1× por sessão.
- **display:none**: Container sempre no DOM após primeiro render do tab; escondido quando inactivo.
- **Stale closures**: `useRef` para `data`, `config`, `canDoCreate`, `canDoEdit`,
  todos os callbacks (`onEventClick`, `onSelect`, `onEventDrop`, `onEventResize`,
  `onTaskClick`, `onDatesSet`).
- **publicId everywhere**: rotas `:eventId` e `:typeId` são sempre `publicId` UUIDs.
- **Lazy init**: `GET /calendar` cria os 3 tipos sistema (`MANUAL/MEETING/REMINDER`)
  se não existirem (idempotente).
- **isSystem=true**: impede eliminação; `systemKey` imutável; `name` editável
  (vazio → repõe i18n via `systemKey`).
- **Toolbar nativa desactivada**: `headerToolbar: false`. Header é `<CalendarHeader>` React.
- **eventAllow** bloqueia drag em `extendedProps.readonly === true` (tasks, milestones,
  project, holidays).
- **Permissões reactivas**: `setOption('selectable', canDoCreate)` /
  `setOption('editable', canDoEdit)` quando `canDo` muda. **NÃO** chamar `destroy()`
  — quebra o widget.
- **Refresh sem reinit**: `removeAllEventSources()` + `addEventSource()` para cada
  source actualizada quando `data` ou `config.sources` mudam.
- **Init aguarda permissões**: widget só é instanciado após `permLoading === false`.
- **Locale**: derivado de `navigator.language` (pt → 'pt', else 'en'). Os textos
  dos botões/empty state vêm de `t('calendar:...')`, não dos locales nativos.

## Ficheiros desta pasta

- @docs/claude/tools/calendar/data-model.md — modelos Prisma, enums, CalendarConfig
- @docs/claude/tools/calendar/interactions.md — handlers FullCalendar, stale closures
- @docs/claude/tools/calendar/rendering.md — sources panel, header, event sources

# Relacionados: @docs/claude/backend.md @docs/claude/db.md @docs/claude/frontend.md
