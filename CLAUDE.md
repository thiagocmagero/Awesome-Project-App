# Awesome Project App

## Ambiente — Docker local + GitHub

A aplicação corre **100% em Docker** no ambiente de desenvolvimento local.
Não há instalação de Node, Postgres ou Prisma directamente no host — tudo
vive nos containers definidos em `docker-compose.local.yml` (volumes
nomeados) ou `docker-compose.yml` (Portainer, com `APP_BASE_PATH`).

- **Stack local**: `docker compose -f docker-compose.local.yml up -d`
- **Containers**:
  - `awesome-project-app-frontend` — Vite dev server (porta `5173`)
  - `awesome-project-app-backend` — NestJS hot reload (porta `3000`)
  - `awesome-project-app-postgres` — PostgreSQL 16 (porta `5432`)
- **Comandos npm/prisma** correm sempre via `docker exec <container> ...`
  (ver README.md secção "Comandos úteis"). Nunca executar `npm install`,
  `npx prisma`, etc. directamente no host.
- **Hot reload activo** em frontend e backend — não reiniciar containers
  para alterações `.ts`/`.tsx`. Reiniciar apenas para: novas deps npm,
  alterações em `vite.config.ts` ou `backend/src/main.ts`.

### Versionamento — GitHub privado

Repositório privado: <https://github.com/thiagocmagero/Awesome-Project-App>
(remote `origin`, branch principal `main`).

- **Versionado**: código (`backend/`, `frontend/`), `docker-compose.yml`,
  `.env.example`, `.gitignore`, `README.md`.
- **Excluído por `.gitignore`** (`*.md` excepto `README.md`): toda a
  documentação markdown — `CLAUDE.md` (este ficheiro), `docs/claude/*`,
  `GANTT.md`, `Vulnerabilidades.md`, `i18n.md`, `clear-comments.md`,
  `especificacao_gantttool.md`. Estes ficheiros vivem **apenas localmente**
  como contexto para Claude Code; não fazem parte do push para o GitHub.
- **Excluído também**: `.env`, `node_modules/`, `*-node_modules/`,
  `postgres-data/`, `dist/`, `coverage/`, `docker-compose.local.yml`.
- **Nunca** comitar `.env` nem credenciais. O `.env.example` é o template
  partilhado.
- **Antes de fazer push** de credenciais ou ficheiros sensíveis, validar
  com `git status` e `git diff --cached`.

## Regra obrigatória — Deploy após cada alteração

SEMPRE que fizer alterações ao código, indicar no final da resposta:

```
### Para aplicar estas alterações:
**Frontend** (container `awesome-project-app-frontend`):
<comandos>

**Backend** (container `awesome-project-app-backend`):
<comandos ou "Sem alterações necessárias">
```

## Regra obrigatória — Actualização do CLAUDE.md

SEMPRE que uma regra for criada ou alterada, reflectir obrigatoriamente neste `CLAUDE.md` e no ficheiro modular relevante em `docs/claude/`. O `CLAUDE.md` é a fonte de verdade das instruções do projecto.

## Regra obrigatória — Guia de novas funcionalidades

Antes de implementar qualquer nova funcionalidade, consultar @docs/claude/new-feature-guide.md.
Quando o utilizador não especificar quais regras aplicar, PERGUNTAR SEMPRE antes de avançar.
Nunca assumir que uma regra não se aplica — em caso de dúvida, perguntar.

## Regra obrigatória — Alinhamento com o template Zynix

SEMPRE que for pedido um componente Zynix (`A:/Arquivos/zynix_template/`), rever **todas** as páginas para alinhar com os padrões: FlatPickr para datas, Choices.js para selects, Default Nav Tabs com `data-bs-toggle="tab"`, Breadcrumb Style-2 com `breadcrumb-style2`. Ver padrões completos em @docs/claude/frontend.md.

## Regra obrigatória — Timezone (Datas Puras vs Momentos Reais)

QUALQUER campo de data/hora introduzido na app deve ser classificado como
**DATA PURA** (label de calendário, sem hora) ou **MOMENTO REAL** (instante
exacto). A escolha define o tipo Postgres, o helper de formatação e o pipeline
de conversão. Detalhes completos, tabela exaustiva por campo, edge cases
(DST, hora ambígua/inexistente) e anti-padrões em @docs/claude/timezone.md.

**Resumo:**
- **DATA PURA** (workDate, weekStart, Project.startDate/endDate,
  GanttTask.startDate/endDate, HolidayDate.date, TimesheetApprovalLog.scopeDate)
  → `timestamp(3)` sem tz, UTC midnight + `formatDate(d, dateFormat)` **tz-agnostic**.
- **MOMENTO REAL** (Notification.createdAt, Session.*At, Comment.createdAt,
  CalendarEvent.startAt/endAt, audit createdAt) → `@db.Timestamptz(6)` +
  `formatMoment(d, tz)` (tz vem de `useTimezone()`).

**Timezone única** — apenas `user.timezone` existe (Mai 2026: `project.timezone`
removido). `useTimezone()` resolve sempre para `user.timezone` (ou browser
fallback). **Nunca** adicionar `projectTimezone` ao `TimezoneProvider` nem
introduzir cascata `Project > User > Browser > UTC`.

User sem timezone definida → frontend detecta browser na primeira sessão e
faz `PATCH /users/me/timezone` (effect em AppLayout).

**Nunca**:
- Usar `@db.Timestamptz` para datas puras (quebra unique constraints).
- Usar `formatMoment` para datas puras (converte tz e altera o "dia X").
- Usar `formatDate` para momentos reais (perde a tz e mostra UTC).
- `new Date()` em cálculos de "hoje" / "weekStart" sem tz explícita
  (em `dateUtils.ts`, `currentWeekStart`/`currentMonthIso`/`isTodayISO`
  aceitam `tz` opcional — passar do `useTimezone()`).

## Regra obrigatória — Wire format DHTMLX em tasks HOUR

A string `"DD-MM-YYYY HH:mm"` que circula entre frontend, DHTMLX e backend
NÃO contém timezone offset. A interpretação semântica é:

- Tasks `durationUnit=DAY`: UTC wall-clock (DATA PURA, invariante).
- Tasks `durationUnit=HOUR`: UTC puro — "09:00" = 9h UTC. `Project.workHours`
  define a janela útil (ex. 9–18) também em UTC. Sem conversão de tz.

Helpers (backend): `ganttToDate`/`formatGanttDate` (UTC puro) em
`backend/src/planning/planning.service.ts`.
`addBusinessHoursInclusive(start, dur, workHours, set)` — UTC-only desde Mai 2026.

Helpers (frontend): `ganttToDate`/`formatGanttDate`/`dateToGanttStr` (UTC puro)
em `frontend/src/features/planning/ganttDateUtils.ts`.

**Nunca**:
- Passar `tz` a `addBusinessHoursInclusive` — função é UTC-only.
- Usar `parseWallClockInTimezone`/`formatWallClockInTimezone` — removidos.
- Usar `ganttToDateInTz`/`formatGanttDateInTz` — removidos.
- Passar `projectTz` a `parseGanttData` — parâmetro removido.
- Recompute `task.duration` para tasks HOUR via `gantt.calculateDuration`
  no toggle Day↔Hour. O duration canónico vem do backend.
- Ler `gantt.getTask(id).duration` num save de drag `mode === 'move'`. Usar
  `tasksRef.current` (estado React do backend).
- Hardcodar `* 9` ou `/ 9` em conversões widget↔task duration. Usar
  `workHours.end - workHours.start` real do projecto via `workHoursRef`.

## Regra obrigatória — Formato de data por projecto

QUALQUER componente que exiba ou edite datas dentro do contexto dum projecto
**deve** consumir o formato configurado no `Project.dateFormat` via
`useResolvedDateFormat()` + helpers de `frontend/src/lib/dateFormatting.ts`
(`formatDate`, `formatDateTime`, `formatDateShort`, `toFlatpickrFormat`,
`toGanttFormat`). Pages globais sem contexto de projecto chamam
`formatDate(d)` directo (cai no `DEFAULT_DATE_FORMAT`).

**Nunca**:
- Hardcodar `'DD/MM/YYYY'`, `'d-m-Y'` ou similar em novos call-sites.
- Mudar `gantt.config.date_format` (`'%d-%m-%Y %H:%i'`) — é o **wire format**
  entre FlatPickr↔DHTMLX↔backend, não display. Display é controlado por
  templates de coluna que chamam `formatDate(date, dateFormatRef.current)`.
- Pré-preencher o form de **criação** de projecto com `DEFAULT_DATE_FORMAT`
  — usar `INITIAL_PROJECT_DATE_FORMAT` (single point of change para a
  futura config user-level).
- Passar data ISO crua a um template i18n com placeholder de data — formatar
  primeiro com `formatDate(d, dateFormat)`.

Pattern completo, lista exaustiva de consumidores, edge cases (singleton
DHTMLX, FlatPickr `useEffect` deps, FullCalendar reactivo) e plano de
extensão futura em @docs/claude/date-formatting.md.

## Regra obrigatória — Frame visual unificado das ferramentas (PlanningPage)

Todas as tabs de [PlanningPage.tsx](frontend/src/pages/PlanningPage.tsx) (Planning,
Gantt, Calendar, Timesheet) usam o **mesmo wrapper visual** abaixo da
toolbar. Implementado via helper local `viewFrameStyle(active)` perto da
declaração de `viewFullscreen`:

- `background: '#fff'`, `border: '1px solid #e6e4f0'`,
  `borderRadius: '8px 8px 0 0'`, `boxShadow: '0 2px 12px rgba(115,93,255,0.07)'`,
  `overflow: 'hidden'`, `display: flex; flexDirection: 'column'; minHeight: 0`.
- **Em fullscreen** (`viewFullscreen=true`): **mantém** `borderRadius` e
  `boxShadow` (preserva identidade visual do frame); apenas ganha `flex: 1`
  para preencher o `viewWrapperRef` (que cobre o viewport via
  `position: fixed; inset: 0`).
- O `display` (`'flex'` vs `'none'`) controla a visibilidade do tab — substitui
  o anterior `display: pageTab === 'X' ? '' : 'none'` aplicado directamente no
  container interno. **Regra "display:none pattern"**: o nó externo do tab
  fica sempre no DOM após primeiro render, é o wrapper que esconde via
  `display:none`.
- **Body branco uniforme em todos os tools**: o wrapper externo é branco e
  cada tool ajusta o seu interno para combinar:
  - Gantt: usa o helper directamente (gantt grid já é branco).
  - Planning: wrapper interno com `padding: 16px` (sem `background` próprio).
  - Calendar: `.calendar-sources-panel` e `.calendar-main` já são brancos.
  - Timesheet: `.ts-frame` tem `background: #fff` (era `var(--ts-bg-page)`).

Ao adicionar uma nova ferramenta tab a `PlanningPage`, envolver o conteúdo
em `<div style={viewFrameStyle(pageTab === 'novo')}>` — **nunca** voltar ao
padrão Bootstrap `card.custom-card` ou container directo sem frame, e
nunca aplicar background cinza nos elementos internos (quebra a uniformidade).

**Sidebars dentro do frame** — qualquer painel lateral (sources, sidebar de
equipa, etc.) usa o **padrão `ts-aside`**:
- card branco com `border: 1px solid #e6e4f0`, `border-radius: 10px`,
  `padding: 14px`, `gap: 16px` entre secções, `align-self: flex-start`.
- section labels com `font-family: 'JetBrains Mono'`, `font-size: 9.5px`,
  `text-transform: uppercase`, `letter-spacing: 0.08em`, `color: #9ca3af`,
  `margin: 0 2px 8px` — **sem título global** do painel; as labels de
  secção dão contexto suficiente.
- O wrapper externo do tab usa `padding: 16px; gap: 16px` no flex container
  para criar respiro entre o sidebar-card e o conteúdo principal.

Implementações actuais: [`ts-aside`](frontend/src/features/timesheet/timesheet.css)
(Timesheet) · [`calendar-sources-panel`](frontend/public/assets/css/calendar-zynix.css)
(Calendar) · [`StatesManagerPanel`](frontend/src/features/planning/components/StatesManagerPanel.tsx)
(offcanvas, padrão diferente).

## Regra obrigatória — Board (Aw-Kanban + hello-pangea/dnd)

O tab "Quadro" usa o widget vendorizado em
[frontend/src/features/awesome-kanban/](frontend/src/features/awesome-kanban/)
(alias Vite `awesome-kanban`). Motor de drag-and-drop:
`@hello-pangea/dnd@^18.0.1`. Estado da tarefa continua ligado a `BoardColumn`
(ver secção "Estado da tarefa = `BoardColumn`" abaixo).

## Regra obrigatória — Calendário do Projecto

A tab "Calendário" da `PlanningPage` usa **FullCalendar v6.1.9** (MIT, em
`frontend/public/assets/libs/fullcalendar/`). Não é DHTMLX — usa **callbacks em
config**, não `api.on/intercept`.

- **3 modelos novos**: `CalendarEventType`, `CalendarEvent`, `CalendarConfig` —
  todos `projectId`-scoped (sem `ProjectCalendar` separado).
- **Lazy-init de tipos sistema** no primeiro `GET /calendar`: `MANUAL`, `MEETING`,
  `REMINDER` (`isSystem=true`, não eliminável; `name`/`color` editáveis).
- **Sources read-only** sobre dados existentes:
  - **Lista única de calendários (CALENDÁRIOS)** ← união dedupada de
    `Holiday` owned pelo user (`ownerId = user.id`) + `Holiday` linkados ao
    projecto via `ProjectHoliday`. Toggle individual por `holidayPublicId`
    persistido em `CalendarConfig.sources.holidays`. Linkados ao projecto
    mostram badge "Projeto". Holidays platform-level (`scope=GLOBAL/REGIONAL`)
    não-linkados e não-owned **não aparecem** (Abril 2026).
  - "Projeto / Tarefas / Milestones" ← `Project` + `GanttTask`.
- **Feature flag** `calendar_view` (PLATFORM_ADMIN bypassa).
- **Permissões granulares**: `CALENDAR_VIEW` (READER), `CALENDAR_EVENT_CREATE`/`EDIT`/`DELETE`
  + `CALENDAR_EVENT_TYPE_MANAGE` + `CALENDAR_CONFIG` (CONTRIBUTOR).
  **READER nunca cria/edita eventos nem tipos**; o widget é montado mas o `select`,
  `eventDrop` e os botões "+ Novo Evento" / "Tipos de eventos" ficam ocultos/inactivos.
- **Singleton** via `calendarInitialized.current`; `display:none` quando o tab
  não está activo. Permissões reactivas via `setOption('selectable', ...)` /
  `setOption('editable', ...)`. Refresh sem reinit via `removeAllEventSources` +
  `addEventSource`.
- **Toolbar nativa do FullCalendar desactivada** (`headerToolbar: false`); o
  header `< > Hoje | título | Mês/Semana/Dia/Lista` é renderizado por
  `<CalendarHeader>` React.
- Ver @docs/claude/tools/calendar/overview.md para detalhes.

## Regra obrigatória — Timesheet: estados, permissões e área global

Funcionalidade Timesheet (V1, Fase 12) — registo semanal de horas por membro.

**Estados de SEMANA** (`TimesheetWeekStatus`): `DRAFT` → `SUBMITTED` →
`PARTIAL` | `APPROVED` | `REJECTED`. O `status` da semana é **derivado** dos
`TimesheetDay` em `recomputeWeekStatus(weekId)`, chamado **sempre** após
qualquer mutação que altere `TimesheetDay.status`.

**Semântica de PARTIAL** (Abril 2026): só aparece quando ≥1 dia foi
**aprovado E ≥1 foi rejeitado** pelo gestor. Dias SUBMITTED ainda pendentes
mantêm a semana em SUBMITTED. Dias sem lançamento são **ignorados** —
não contam como pendentes nem influenciam o estado.

**Estados de DIA** (`TimesheetDayStatus`): independentes entre si dentro da
mesma semana. `DRAFT`/`REJECTED` ⇒ editável pelo utilizador. `SUBMITTED`/
`APPROVED` ⇒ bloqueado (REQ-S04, REQ-G09).

**Resubmissão pós-rejeição** (REQ-T08): só os dias `REJECTED` (e novos
`DRAFT`) entram na fila. Dias `APPROVED` ficam **intocados**.

**Permissões** (2 novas em `ProjectAction`): `TIMESHEET_LOG` (Reader+ default,
delegável) e `TIMESHEET_APPROVE` (Owner default, delegável, não-transitiva).
Toda a rota project-scoped usa `@RequireProjectPermission(ProjectAction.TIMESHEET_*)`.

**Auditoria** (`TimesheetApprovalLog`, REQ-A06): imutável — service nunca expõe
update/delete. Cada submit/approve/reject/revert cria uma linha na **mesma
transação** da mutação que a originou. Action `REVERT` (Abril 2026) é
registada quando o gestor "edita" uma aprovação/rejeição existente.

**Editar aprovação/rejeição** (Abril 2026): quando uma semana já tem dias
APPROVED/REJECTED (sem SUBMITTED pendentes), os botões "Aprovar/Rejeitar" do
`<TimesheetTeamPersonHeader>` são **ocultados** e em vez deles aparecem
"Editar aprovação semana" e "Editar aprovação mês". O endpoint
`POST /timesheets/revert/{week|month}` reverte os dias para SUBMITTED e cria
audit log com `action=REVERT`. Gestor pode então re-aprovar/re-rejeitar.

**Confirmações obrigatórias** (Abril 2026): toda a acção (submit, approve
day/week/month, copy, edit) passa por `confirmAction()` (`frontend/src/lib/confirm.ts`)
— helper Swal sem ícone, baseado no Confirm Alert do template Zynix. Textos em
i18n nos 4 locales (`confirm.<action>.title/text/confirm`).

**Rejeição por dia com selector** (Abril 2026): o `<TimesheetRejectDayModal>`
pede ao gestor QUAL dia rejeitar (entre os SUBMITTED da semana) + motivo
obrigatório. Cada chamada é uma transacção separada → o gestor pode rejeitar
dias diferentes com motivos diferentes (chama o modal várias vezes). Para o
utilizador, o `<TimesheetRejectionBanner>` renderiza um banner por dia
rejeitado (cada um com o seu motivo).

**Vista mensal do gestor** (Abril 2026): em `subTab='team'` o gestor pode
alternar entre **Mensal** (panorama, default) e **Semanal** (drill-down). A
vista mensal usa **FullCalendar dayGridMonth** com `validRange` derivado das
datas do projecto. Cada célula mostra `X/Y` (utilizadores que lançaram / total)
em modo agregado, ou `✓/✗` em modo individual (selectionado pela sidebar).
Coluna SEMANA à direita resume cada semana ISO 8601 com link de drill-down.
Click num dia ou na célula da semana → muda automaticamente para vista semanal
posicionada nessa semana. Endpoint:
`GET /api/projects/:id/timesheets/calendar?month=YYYY-MM[&userId=PUBLICID]`
(permissão `TIMESHEET_APPROVE`).

**Notificações** (4 novas em `NotificationType`): `TIMESHEET_SUBMITTED`,
`TIMESHEET_APPROVED`, `TIMESHEET_PARTIALLY_APPROVED`, `TIMESHEET_REJECTED`.
Sempre fire-and-forget com `.catch(() => {})`. `TIMESHEET_REJECTED.body` inclui
o `reason` (REQ-N04).

**Área global `/timesheets`**: dois modos — "As minhas" (próprias semanas em
todos os projectos) e "Para aprovar" (fila de aprovação centralizada). Tab
"Para aprovar" gated por `useTimesheetApprovalAccess()` →
`/timesheets/has-approval-access`. **Aprovação granular por dia NÃO está
disponível na área global**: só por semana inteira. Para aprovar dia, abrir
o detalhe via vista do projecto.

**Feature flag** `timesheet_view` (PLATFORM_ADMIN bypassa).

Ver @docs/claude/tools/timesheet/overview.md para detalhes.

## Regra obrigatória — Cap de duração de tasks Gantt (configurável)

`GanttTask.duration` tem um cap **único** expresso em **dias úteis**, configurável
ao nível PLATFORM_ADMIN via `PlatformLimits.maxTaskBusinessDays` (singleton id=1).
Default 1300 (~5 anos calendário). Tasks HOUR convertem-se via
`dailyHours = workHours.end - workHours.start` antes da comparação.

**Endpoints:**
- `GET /api/platform-config/limits` — JWT (qualquer user pode ler).
- `PATCH /api/platform-config/limits` — JWT + PLATFORM_ADMIN.

**Helper canónico**: `assertTaskDurationWithinLimit(duration, unit, workHours, max)`
em [limits.util.ts](backend/src/planning/limits.util.ts). Substitui o cap
genérico `duration > 1000` (que era arbitrário e per-unit). Aplicado em
`PlanningService.createTask` e `updateTask` após resolver `workHours` do
projecto e o `max` actual via `PlatformConfigService.getMaxTaskBusinessDays()`.

**Erro**: `TASK_DURATION_EXCEEDS_LIMIT` (400). Frontend mapeia para
`task.error_duration_too_long` no toast/alert (`useTaskForm.handleTaskSubmit` +
`onAfterTaskDrag`).

**UI**: PlatformConfigPanel ganha aba "Limits" com input numérico + estimativa
em anos calendário (`/260`). Detalhes em
@docs/claude/tools/gantt/data-model.md secção "durationUnit".

## Regra obrigatória — Granularidade de tasks Gantt (DAY vs HOUR)

`GanttTask` tem duas granularidades co-existentes via `durationUnit`:
- **DAY** (default, retrocompat): `duration` em dias úteis, `endDate`
  calculado por `addBusinessDaysInclusive` (em
  [business-days.util.ts](backend/src/planning/business-days.util.ts)).
- **HOUR**: `duration` em horas úteis dentro de `Project.workHours`,
  `endDate` calculado por `addBusinessHoursInclusive` (em
  [business-hours.util.ts](backend/src/planning/business-hours.util.ts)).
  Hora exacta interpretada no `project.timezone` — toda a equipa vê a
  mesma hora (regra do timezone, datas puras com hora dentro do contexto
  do projecto, sem conversão na UI).

Tasks DAY criadas antes desta feature continuam imutáveis. Apenas tasks
novas ou explicitamente convertidas pelo user via TaskModal (switch
"Definir hora exacta") ganham hora.

**Toggle de vista do widget** ("Day" | "Hour" na toolbar) muda apenas a
densidade visual: `gantt.config.duration_unit`, escalas (`day`+`hour`),
snap (`duration_step = 0.25` em HOUR), recompute de `task.duration` via
`gantt.calculateDuration`. **Não** altera `task.durationUnit` no DB —
esse é per-task. Tasks DAY e HOUR co-existem em qualquer modo do widget.

**Project.workHours**: JSON `{ start: 0..23, end: 1..24 }` (default null
⇒ `09:00–18:00`). Aplica-se apenas a tasks HOUR. Configurado na aba
"Região e Idioma" do modal de projecto.

**Nunca**:
- Calcular `endDate` para uma task HOUR via `addBusinessDaysInclusive`
  (ignora janela útil + horas) — usar sempre `addBusinessHoursInclusive`.
- Criar uma task com hora exacta sem definir `durationUnit = HOUR` no
  DTO — o backend assume DAY e arredonda para dia inteiro.
- Mudar `gantt.config.duration_unit` directamente sem chamar
  `setGanttGranularity` — recompute de `task.duration` é necessário ou
  as barras colapsam visualmente.

Detalhes completos, algoritmo de `addBusinessHoursInclusive`, edge cases
(cross-day, cross-weekend, cross-holiday) e tabela DAY vs HOUR em
@docs/claude/tools/gantt/data-model.md, @docs/claude/tools/gantt/interactions.md.

## Regra obrigatória — Estado da tarefa = `BoardColumn`

Desde Abril 2026 o "estado" duma tarefa é a `BoardColumn` (`GanttTask.boardColumnId`).
O campo legado `GanttTask.status` foi renomeado para `legacyStatus` e será removido.
- A mudança de estado é feita no TaskModal (select) e persiste via
  `PATCH /projects/:id/planning/tasks/:taskId/state`.
- CRUD de Estados vive em `PlanningStatesController` (`/projects/:id/planning/states/*`)
  — sem feature flag.
- Permissão `STATE_MANAGE` — apenas OWNER por default; delegável.
- Hook frontend: `usePlanningStates(projectId)` (`features/planning/usePlanningStates.ts`).
- Tipos partilhados: `ITaskState`, `ITaskSwimlane` em `features/planning/states-types.ts`.

## Stack

| Camada   | Tecnologia                  | Versão                              |
|----------|-----------------------------|-------------------------------------|
| Frontend | React + TypeScript + Vite   | React 18, Vite 6, TS 5              |
| Backend  | NestJS + TypeScript         | NestJS 10, TS 5                     |
| ORM      | Prisma                      | 6.x                                 |
| BD       | PostgreSQL                  | 16 (Bookworm)                       |
| Runtime  | Node.js                     | 22 (Bookworm Slim)                  |
| Auth     | JWT (passport-jwt) + bcrypt | —                                   |
| UI       | Zynix Bootstrap 5           | assets em `frontend/public/assets/` |

## Comandos essenciais (dentro dos containers Docker)

**Backend** (`awesome-project-app-backend`):
```bash
npm run start:dev          # hot reload
npm run build
npx prisma generate        # após alterar schema.prisma
npx prisma migrate dev     # nova migração (dev)
npx prisma migrate deploy  # aplica migrações (prod)
npm run seed
```

**Frontend** (`awesome-project-app-frontend`):
```bash
npm run dev    # hot reload — alterações .tsx aplicam-se automaticamente
npm run build
```

> Reiniciar container apenas quando: novas deps npm, `vite.config.ts`, ou `main.ts` backend.

## Referências modulares

@docs/claude/architecture.md             (estrutura dirs, portas, Docker, env vars, fases, sidebar)
@docs/claude/auth.md                     (JWT, guards, perfis, roles, planos, convites, selfRegistered)
@docs/claude/backend.md                  (NestJS, endpoints, módulos, DTOs, convenções)
@docs/claude/db.md                       (Prisma, modelos, migrações, seeds, soft delete)
@docs/claude/frontend.md                 (React, Zynix, toasts, proxy, padrões de componentes)
@docs/claude/i18n.md                     (react-i18next, namespaces, chaves, convenções)
@docs/claude/date-formatting.md          (formato de data por projecto: helper, Context, hook, wire vs display, pattern por widget)
@docs/claude/timezone.md                 (timezone: hierarquia binária, datas puras vs momentos reais, helpers, anti-padrões)
@docs/claude/notifications.md            (mecanismo de notificações: modelo, endpoints, hook, dropdown, gaps)
@docs/claude/tools/gantt/overview.md     (Gantt — ponto de entrada obrigatório)
@docs/claude/tools/gantt/data-model.md   (modelos Prisma Gantt, holidays, GanttConfig)
@docs/claude/tools/gantt/interactions.md (drag & drop, eventos DHTMLX, stale closures)
@docs/claude/tools/gantt/rendering.md    (layout 2 painéis, colunas, CSS, resourceGrid)
@docs/claude/tools/calendar/overview.md     (Calendário — ponto de entrada obrigatório)
@docs/claude/tools/calendar/data-model.md   (modelos Prisma Calendar, HolidayScope, CalendarConfig)
@docs/claude/tools/calendar/interactions.md (FullCalendar callbacks, stale closures, singleton)
@docs/claude/tools/calendar/rendering.md    (sources panel, header customizado, event sources)
@docs/claude/tools/timesheet/overview.md     (Timesheet — ponto de entrada obrigatório)
@docs/claude/tools/timesheet/data-model.md   (modelos Prisma Timesheet, enums, endpoints REST)
@docs/claude/tools/timesheet/interactions.md (fluxos submit/approve/reject/copy, transições de estado)
@docs/claude/tools/timesheet/rendering.md    (grelha, status pills, banner, modais, área global)
@docs/claude/new-feature-guide.md        (guia de criação de novas funcionalidades — ponto de entrada obrigatório)
@docs/claude/permissions.md              (metodologia de permissões — regras obrigatórias)
@docs/claude/tools/permissions/overview.md (permissões — ponto de entrada)
@docs/claude/tools/permissions/data-model.md (modelos, enum, resolução)
