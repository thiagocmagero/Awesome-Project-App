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

## Regra obrigatória — Segurança: Guard em todas as rotas de escrita

**Premissa máxima e irrevogável da aplicação.** TODA a rota que altera dados
ao nível de um projecto DEVE ter:

```typescript
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
@RequireProjectPermission(ProjectAction.XXXXX)
```

**Sem excepções.** Mesmo que o endpoint valide ownership no service, o guard é
obrigatório — garante consistência, defesa em profundidade, e protege se algum
service for refactored sem manter a verificação.

**Princípios derivados:**
- Authentication (JWT) e authorization (guards) são a **defesa primária**.
- Nenhum endpoint de escrita pode confiar apenas em validação interna do service.
- Todo `@Post`/`@Patch`/`@Put`/`@Delete` que toca dados de projecto tem guard.
- Endpoints de leitura cross-tenant (ex.: `/api/projects`) filtram no service
  por ownership/membership; mesmo aí, autenticação é mandatória.
- A API **nunca** expõe `id` numérico interno — apenas `publicId` UUID v7.
  Excepção documentada: `Task.id`/`TaskLink.id`/`parent`/`source`/`target`
  por compatibilidade DHTMLX (IDs locais ao projecto, scoped pelo guard).

Detalhes completos, hierarquia de roles, padrão UI espelho (`canDo()`),
intercepts em widgets DHTMLX e anti-padrões em @docs/claude/permissions.md
e @docs/claude/tools/permissions/overview.md.

## Regra obrigatória — Audit Logs em todos os endpoints

**Premissa máxima.** TODA a chamada HTTP é registada automaticamente em
`AuditLog` pelo `AuditLogInterceptor` global — sem código nos controllers.
Captura: `userId`, `sessionId`, `method`, `url`, `statusCode`, `duration`,
`ip`, `userAgent`, `status` (`SUCCESS`/`ERROR`/`FORBIDDEN`), `errorMessage`.

Endpoints **`@Post`/`@Patch`/`@Put`/`@Delete`** **devem** adicionar
`@Audit(...)` para enriquecer com semântica de domínio:

```typescript
import { Audit } from '../audit-log/decorators/audit.decorator';

@Audit({
  action: 'PROJECT_DELETED',
  resourceType: 'project',
  resourceId: (req) => req.params.id,
})
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

**Convenções:**
- `action`: `SCREAMING_SNAKE_CASE` no passado (`USER_LOGIN`, `USER_CREATED`,
  `PROJECT_DELETED`, `PASSWORD_RESET`, `FILE_DELETED`).
- `resourceType`: substantivo singular minúsculo (`user`, `project`, `task`,
  `file`).
- `resourceId`: sempre `publicId` UUID v7 (ex.: `(req) => req.params.id`).
  Nunca `id` numérico interno.

**Princípios derivados:**
- O auto-log NUNCA bloqueia o request (try/catch silencioso + fire-and-forget).
- Não logar passwords/tokens — `sanitizeUrl` mascara `?token=...`/`?password=...`/
  `?secret=...`/`?api_key=...`. Adicionar à regex se introduzires novos
  query params sensíveis.
- Endpoints `GET` de leitura ficam só com auto-log (sem `@Audit` — semântica
  é o próprio path).
- Acesso a `/audit-logs` é exclusivo `PLATFORM_ADMIN` e está excluído do
  auto-log (anti-loop).
- `AuditLog` é imutável — sem endpoints de update/delete.

Detalhes completos (modelo, pipeline, frontend, anti-padrões) em
@docs/claude/audit-logs.md.

## Regra obrigatória — User cascade rule

QUALQUER novo modelo Prisma com FK para `User` **deve** declarar `onDelete`
explícito (`Cascade` ou `SetNull`). Sem essa declaração, Prisma assume
`Restrict` e o hard delete recursivo (`UsersService.removeHard`, PLATFORM_ADMIN
only via `DELETE /api/users/:id?hard=true`) **falha silenciosamente**, deixando
"lixo desconhecido" no schema.

Política:
- **Cascade**: dados pessoais (sessions, notifications, subscriptions,
  invoices, memberships, mentions, reactions, ...).
- **SetNull**: campos de auditoria/autoria (createdById, invitedById, authorId,
  actorId, approvedById, ...) — campo tem que ser `Int?`.
- **SetNull**: ownership de entidades que sobrevivem (Project.owner,
  Team.owner, Holiday.owner, ...).

Tabela completa por modelo + checklist em @docs/claude/db.md secção
"User cascade rule".

## Regra obrigatória — Catálogo formal de entitlement keys

Todas as chaves de **feature flags** (ex.: `gantt_view`, `upload`) e **limites
de plano** (ex.: `max_projects`, `max_storage_mb`) vêm de um catálogo único
tipado. Strings literais espalhadas (typos silenciosos) são **proibidas**.

**Backend** — fonte de verdade: [`backend/src/common/entitlements.ts`](backend/src/common/entitlements.ts).
Exporta `FeatureKey` e `LimitKey` como `as const`. Usar sempre:

```typescript
@RequireFeature(FeatureKey.GANTT_VIEW)
@CheckPlanLimit(LimitKey.MAX_PROJECTS, { projectIdFrom: 'params.id' })
await this.featureFlags.isEnabled(userId, FeatureKey.UPLOAD_SECURED);
await this.usage.increment(workspaceId, LimitKey.MAX_HOLIDAYS);
```

Os decorators `@RequireFeature` e `@CheckPlanLimit` são tipados — TypeScript
rejeita strings que não estão no enum em tempo de compilação. Os métodos
`FeatureFlagsService.isEnabled/isEnabledForUser` e
`UsageService.increment/decrement/incrementBy/decrementBy/adjustBy/checkLimit`
aceitam só o tipo correto.

**Seeds** — [`backend/prisma/seeds/entitlement-keys.js`](backend/prisma/seeds/entitlement-keys.js)
é o espelho CommonJS do catálogo, importado por `seed.js` e
`seeds/02-plans.seed.js`. Tem de ser **mantido em sincronia manual** com o
`.ts` (qualquer chave nova vai aos dois ficheiros). Razão: o seed corre via
`node`, não tem ts-node para importar do `.ts`.

**Frontend** — espelho em [`frontend/src/lib/entitlements.ts`](frontend/src/lib/entitlements.ts).
Mesmos valores, mesmos nomes. `useFeatureFlag` aceita `FeatureKey`;
`PlansPage.LIMIT_KEYS` é `ALL_LIMIT_KEYS` exportado do catálogo.

**Adicionar uma nova chave:**
1. Acrescentar a `backend/src/common/entitlements.ts` (TS, fonte primária).
2. Acrescentar a `backend/prisma/seeds/entitlement-keys.js` (CJS, mesmo valor).
3. Acrescentar a `frontend/src/lib/entitlements.ts` (TS frontend).
4. Acrescentar à seed (`02-plans.seed.js`) usando `FeatureKey.X` ou
   `LimitKey.X`.

**Anti-padrões:**
- ❌ `@RequireFeature('gantt_view')` — string literal, perde verificação de tipo.
- ❌ `usage.increment(id, 'max_projects')` — idem.
- ❌ Hardcodar `['max_projects', 'max_teams', ...]` em UI ou serviços — usar
  `ALL_LIMIT_KEYS` ou `ALL_FEATURE_KEYS` do catálogo.
- ❌ Adicionar uma chave a um dos catálogos sem actualizar os outros — drift
  silencioso entre seeds/backend/frontend.

## Regra obrigatória — PLATFORM_ADMIN bypass das feature flags

O hook `useFeatureFlag` (frontend) e os guards `FeatureFlagGuard` /
`PlanLimitGuard` (backend) **já tratam internamente** o bypass para
utilizadores com perfil `PLATFORM_ADMIN`. Componentes/handlers não devem
duplicar a verificação.

**Padrão correcto:**

```tsx
// Frontend — apenas o hook decide se a feature está disponível.
const { enabled: showGantt } = useFeatureFlag(FeatureKey.GANTT_VIEW, projectId);
if (showGantt) { /* render */ }
```

**Anti-padrões:**
- ❌ `enabled || isAdmin` (qualquer combinação com check de admin) — duplica
  lógica que já existe no hook. PLATFORM_ADMIN passa a `true` no hook, sem
  chamada ao backend.
- ❌ Verificar admin antes de usar `useFeatureFlag` para "saltar" a resposta
  do backend — desnecessário, o hook curto-circuita.

## Regra obrigatória — Verificação de PLATFORM_ADMIN fora de feature flags

Para verificações de admin que **não** envolvem feature flags (ex.: edição de
comentários de qualquer autor, gating de páginas admin-only, mostrar acções
extra na UI), usar sempre o hook
[`useIsPlatformAdmin`](frontend/src/hooks/useIsPlatformAdmin.ts):

```tsx
import { useIsPlatformAdmin } from '../hooks/useIsPlatformAdmin';

const isAdmin = useIsPlatformAdmin();
if (isAdmin) { /* render acção exclusiva */ }
```

**A string literal `'PLATFORM_ADMIN'` deve existir apenas dentro de
`useIsPlatformAdmin.ts`.** Qualquer comparação inline com `user?.profileCode`
está proibida em código novo.

**Anti-padrões:**
- ❌ `user?.profileCode === 'PLATFORM_ADMIN'` inline — usar o hook.
- ❌ `user.profileCode !== 'PLATFORM_ADMIN'` em redirect guards — usar
  `if (user && !isAdmin)` para preservar a semântica de "espera o user
  carregar antes de redirecionar".
- ❌ Combinar `useIsPlatformAdmin()` com `useFeatureFlag()` para fazer bypass
  duplo — o `useFeatureFlag` já chama o `useIsPlatformAdmin` internamente.

**Excepções legítimas (não usar este hook):**
- Whitelist multi-perfil tipo `['PLATFORM_ADMIN', 'BASIC_USER'].includes(...)`
  (ex.: `ProtectedRoute`, redirect pós-login) — semântica diferente, é "user
  pertence a este conjunto", não "user é admin".
- Comparação contra um campo `role` de payload de API que não é o
  `profileCode` do user (ex.: `useProjectPermissions` compara contra a role
  retornada por `/projects/:id/my-permissions`).

## Regra obrigatória — Actualização do CLAUDE.md

SEMPRE que uma regra for criada ou alterada, reflectir obrigatoriamente neste `CLAUDE.md` e no ficheiro modular relevante em `docs/claude/`. O `CLAUDE.md` é a fonte de verdade das instruções do projecto.

## Regra obrigatória — Guia de novas funcionalidades

Antes de implementar qualquer nova funcionalidade, consultar @docs/claude/new-feature-guide.md.
Quando o utilizador não especificar quais regras aplicar, PERGUNTAR SEMPRE antes de avançar.
Nunca assumir que uma regra não se aplica — em caso de dúvida, perguntar.

## Regra obrigatória — i18n: usar o mecanismo existente

TODO frontend (`frontend/` actual e `frontend2/` migrado) usa o mesmo mecanismo
de i18n: `i18next` + `react-i18next` + namespaces seeded no backend em
`backend/prisma/seeds/translations/*.json` + URL com prefixo locale
(`/{locale}/...`) + helpers de canonicalização em `src/lib/locale.ts` +
`LocaleContext`/`LocaleGuard`/`RedirectWithLocale`.

**Qualquer string visível ao utilizador** (label, placeholder, mensagem de
erro, título de modal, copy de email, etc.) **deve passar por `t()`**. Sem
excepções.

**Antes de criar uma nova chave i18n**, verificar SEMPRE se já existe equivalente:
- Procurar em `backend/prisma/seeds/translations/*.json` (24 namespaces:
  common, auth, dashboard, users, teams, projects, plans, holidays, planning,
  permissions, translations, calendar, gantt, board, sessions, notifications,
  timesheet, account, platform_config, workspace_members, files, audit, tags,
  email).
- Se existe equivalente exacto ou suficientemente próximo → reutilizar.
- Se NÃO existe → **parar e perguntar ao utilizador antes de adicionar**.
  Apresentar a chave proposta (namespace + path) + texto pt-PT + razão; só
  criar com OK explícito.

**Frontend a portar (`frontend2/`)**: aplicam-se as mesmas regras. Toda
componente migrada do mockup tem de assumir o chaveamento de tradução
existente. Marcar strings sem match exacto com `// TODO i18n` + chave
proposta, e listar no fim de cada PR para aprovação batch.

**Fluxo para adicionar chave nova (após autorização)**:
1. Editar `backend/prisma/seeds/translations/<namespace>.json` nos 4 locales
   (`pt-PT`, `pt-BR`, `en`, `es`).
2. `docker exec awesome-project-app-backend npm run seed`.
3. Frontend recebe via `LocalStorageBackend` automaticamente na próxima
   sessão (ETag-based; cache em `localStorage`).

**Anti-padrões**:
- ❌ Hardcodar string em JSX/TSX sem `t()` em código novo.
- ❌ Criar chave silenciosamente sem perguntar primeiro.
- ❌ Duplicar chaves entre namespaces (`common:nav.projects` vs `projects:nav.list`).
- ❌ Inventar namespaces fora dos 24 registados em `src/i18n/index.ts`.
- ❌ Em `frontend2/`: usar `t()` com fallback inline (`t('x', 'PT default')`)
  como atalho para evitar perguntar — quebra o controlo central do glossário
  e o `missingKeyHandler` regista ruído na `MissingTranslation`.

Detalhes completos do mecanismo em @docs/claude/i18n.md.

## Regra obrigatória — WebSocket sempre sob `/api/socket.io`

Qualquer `@WebSocketGateway` novo **deve** declarar `path: '/api/socket.io'`
(não `/socket.io`). Razão: o cookie HttpOnly `access_token` tem `Path=/api` —
fora desse prefixo o browser **não envia** o cookie no handshake e o gateway
rejeita silenciosamente.

O cliente Socket.io espelha: `io('/namespace', { path: '/api/socket.io', withCredentials: true })`.

O Vite proxy já tem `ws: true` na regra `/api` — **não** criar regra
`/socket.io` separada (causa rotas duplicadas e quebra cookies).

Push de notificações é o caso actual ([`backend/src/notifications/notifications.gateway.ts`](backend/src/notifications/notifications.gateway.ts) + [`frontend/src/contexts/WebSocketContext.tsx`](frontend/src/contexts/WebSocketContext.tsx)).
Para adicionar push noutras tools (Board, Gantt, Timesheet), criar gateway
próprio sob `/api/socket.io` com namespace dedicado e usar
`useWebSocket().on(event, handler)` no frontend — não criar Provider novo.
Detalhes completos em @docs/claude/notifications.md secção "WebSocket — push em tempo real".

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
  Task.startDate/endDate, HolidayDate.date, TimesheetApprovalLog.scopeDate)
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
  - "Projeto / Tarefas / Milestones" ← `Project` + `Task`.
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

`Task.duration` tem um cap **único** expresso em **dias úteis**, configurável
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

`Task` tem duas granularidades co-existentes via `durationUnit`:
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

Desde Abril 2026 o "estado" duma tarefa é a `BoardColumn` (`Task.boardColumnId`).
O campo legado `Task.status` foi renomeado para `legacyStatus` e será removido.
- A mudança de estado é feita no TaskModal (select) e persiste via
  `PATCH /projects/:id/planning/tasks/:taskId/state`.
- CRUD de Estados vive em `PlanningStatesController` (`/projects/:id/planning/states/*`)
  — sem feature flag.
- Permissão `STATE_MANAGE` — apenas OWNER por default; delegável.
- Hook frontend: `usePlanningStates(projectId)` (`features/planning/usePlanningStates.ts`).
- Tipos partilhados: `ITaskState`, `ITaskSwimlane` em `features/planning/states-types.ts`.

## Regra obrigatória — Workspace (entidade explícita)

Toda a aplicação é **workspace-scoped**. Cada utilizador tem ≥1 workspace
(V2, Maio 2026 — migração `20260517100000_workspaces_v2_drop_owner_unique`
removeu o unique em `Workspace.ownerId`). O primeiro workspace é auto-criado
no registo; extras criados via `POST /api/v1/workspaces` autenticado.

**Premissas máximas:**
- 9 tabelas têm `workspaceId` como chave de scope: Project, Team, Holiday,
  UserType, WorkspaceMember, Subscription, Invoice, UsageRecord, UserFeatureFlag.
- Em queries novas, filtrar por `workspaceId` em vez de `ownerId`. `ownerId` é
  audit field (preservado em Project/Team/Holiday/UserType).
- `User.delete` (PLATFORM_ADMIN hard delete) cascades para Workspace (e cada um
  dos seus) e daí para todas as 9 tabelas — ver `User cascade rule` em @docs/claude/db.md.
- Auto-criação obrigatória nos 4 hooks de criação de User
  (`auth.register`, `createAccountFromInvite`, `users.service.create`, seed) —
  garante que todo o user tem sempre pelo menos 1 workspace.
  Pattern: `prisma.user.create({ data: { ..., workspaces: { create: { name } } } })`.

**Resolução de workspace em runtime**:
- `WorkspacesService.getDefaultForUser(userId)` — V2: `findFirst orderBy createdAt asc`
  (workspace mais antigo). Preserva semântica V1 para users com 1 workspace.
- `WorkspacesService.findAllForUser(userId)` — lista owned + WorkspaceMember(ACCEPTED).
- `WorkspacesService.createWorkspace(userId, name)` — transacção: cria Workspace +
  Subscription default. Audit `WORKSPACE_CREATED`.
- `SubscriptionsService.resolveEffectiveWorkspaceId(userId, ctx)` — context-aware
  com LICENSED seats. Usado por UsageService, FeatureFlagsService, PlanLimitGuard.
- **Anti-padrão**: `workspace.findUnique({ where: { ownerId } })` — não compila
  desde V2 (constraint removida); usar sempre `findFirst({ ..., orderBy: { createdAt: 'asc' } })`.

**API URLs versionadas sob `/api/v1`** (estilo Asana). Browser URLs ficam
inalterados (V2 futuro: `/<workspacePublicId>/...`). Frontend envia
header `X-Workspace-Id` via apiFetch (informativo; backend resolve via JWT).

Detalhes completos em @docs/claude/workspaces.md.

## Regra obrigatória — API global prefix `/api/v1`

Todas as rotas da API vivem sob `/api/v1`. Configurado em
`backend/src/main.ts` via `app.setGlobalPrefix('api/v1')`. Frontend resolve via
`getApiBase()` que devolve `/api/v1`.

Webhook GuardDuty também vive sob este prefixo (`/api/v1/webhooks/guardduty`)
— re-subscribe SNS em dev se aplicável. Cookies de auth: `access_token` com
`Path=/api` (catches `/api/v1/*` por prefix-match), `refresh_token` com
`Path=/api/v1/auth/refresh` (alinhado com endpoint).

Versionar via path (em vez de header) é explícito, future-proof para API
pública e permite coexistência V1/V2 quando necessário.

## Regra obrigatória — Upload de ficheiros

Funcionalidade de upload e gestão de ficheiros project-scoped, gated por
feature flag `upload`. Sub-flag `upload_secured` activa scan AWS GuardDuty
Malware Protection — escolhida no momento do upload com base no plano do
**dono do projecto**. Ficheiros antigos não migram quando o plano muda.

**Premissas máximas e irrevogáveis**:
- API **nunca** expõe `bucketKey` nem ownership no path. Apenas `publicId`
  UUID v7 e UUID v4 random no key do bucket.
- `FILE_VIEW`/`FILE_UPLOAD`/`FILE_RENAME`/`FILE_DELETE` são `ProjectAction`
  com guards e UI espelho obrigatórios (ver @docs/claude/permissions.md).
- Quota cobrada **sempre no plano do owner do projecto**, não do uploader
  — coerente com seats LICENSED.
- Validação em camadas: file-type magic bytes → MIME allowlist →
  extension allowlist → tamanho. Todas configuráveis pelo PLATFORM_ADMIN
  em `/settings/limits`.
- Webhook GuardDuty público (`POST /api/webhooks/guardduty`, `@SkipCsrf`)
  com verificação obrigatória de assinatura SNS — sem signature, qualquer
  atacante poderia apagar ficheiros marcando como INFECTED.
- Filename do Multer passa por `decodeMultipartFilename` (Latin-1→UTF-8
  round-trip) — sem isto, acentos vêm mangled (`Ã§` em vez de `ç`).
- Download via presigned URL com `ResponseContentDisposition: attachment;
  filename*=UTF-8''<encoded>` para o browser descarregar com o nome
  humano (bucket key continua opaco).

Detalhes completos (modelo, pipeline, GuardDuty, UI, anti-padrões) em
@docs/claude/uploads.md.

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
@docs/claude/email.md                    (envio de emails transacionais: SMTP Brevo, React Email, locale-aware, 10 tipos)
@docs/claude/storage.md                  (wrapper AWS S3: env vars, StorageService, pipeline genérico de validação, avatares no bucket público)
@docs/claude/workspaces.md               (workspace explícito: modelo, auto-criação, runtime helpers, V1/V2 path, anti-padrões)
@docs/claude/uploads.md                  (upload de ficheiros project-scoped: File model, flags upload/upload_secured, GuardDuty, permissões FILE_*, presigned download, UI)
@docs/claude/audit-logs.md               (audit trail técnico: AuditLog model, interceptor global, @Audit decorator, /audit page, tab Audit em /clients)
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
