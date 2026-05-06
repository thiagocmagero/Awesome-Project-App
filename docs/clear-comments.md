# Remoção de Comentários — Mapa de Alvos

> **Objectivo**: eliminar todos os comentários presentes no código-fonte antes de builds de produção.
> Comentários em código compilado/bundled expõem lógica de negócio, requisitos internos,
> notas de arquitectura e potencialmente informação sensível. Este documento mapeia todos
> os ficheiros alvo e define o procedimento de limpeza.

---

## Contexto

A base de código contém extensos comentários (estimativa: **≥ 3 500 linhas**) distribuídos por
ficheiros `.ts`, `.tsx` e `.css` custom. Os comentários são úteis durante desenvolvimento
mas **não devem chegar a builds de produção** pelos seguintes motivos:

1. Vite (frontend) inclui comentários no bundle por omissão em `mode=development`. Em
   `mode=production` o Terser remove a maioria, mas comentários preservados com `/*! … */`
   ou comentários JSDoc em certos contextos podem sobreviver.
2. O compilador NestJS (`tsc`) não remove comentários por omissão — estão presentes no
   output `dist/`.
3. Source maps expostos revelam os comentários originais mesmo quando o bundle está
   minificado.
4. Comentários em PT referem requisitos internos (ex.: `REQ-A06`, `REQ-T08`), arquitetura
   e decisões de negócio que não devem ser públicos.

---

## Tipos de Comentários a Remover

| Tipo | Sintaxe | Onde ocorre |
|------|---------|-------------|
| Inline | `// texto` | `.ts`, `.tsx` |
| Bloco | `/* … */` | `.ts`, `.tsx`, `.css` |
| JSDoc | `/** … */` | `.ts`, `.tsx` |
| Separadores decorativos | `// ── Secção ──` | `.ts`, `.tsx` |
| Anotações internas | `// REQ-XXX`, `// NOTE:`, `// TODO:` | `.ts`, `.tsx` |
| HTML | `<!-- … -->` | `.tsx` |
| Cabeçalhos CSS | `/* Component: … */`, `/* Tokens */` | `.css` |

---

## Exclusões — Não Alterar

- `frontend/public/assets/libs/` — bibliotecas vendor (DHTMLX, FullCalendar, etc.)
- `frontend/public/assets/css/` excluindo os ficheiros listados na secção CSS abaixo
- `node_modules/`
- `backend/prisma/migrations/` — SQL gerado automaticamente
- `*.d.ts` — ficheiros de declaração de tipos
- `backend/prisma/seed.js` — script de seed (não vai para produção)
- `backend/prisma/seeds/` — dados de seed

---

## Ficheiros Alvo

### 1. Frontend — React / TypeScript (`.tsx` / `.ts`)

#### 1.1 Páginas (`frontend/src/pages/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `PlanningPage.tsx` | ~147 | Inline PT, separadores `// ──`, blocos de secção, lógica de estado |
| `ProjectsPage.tsx` | ~25 | Inline lógica, comentários de modal |
| `HolidaysPage.tsx` | ~18 | Inline, notas de validação |
| `UsersPage.tsx` | ~12 | Inline, comentários de form |
| `TeamsPage.tsx` | ~10 | Inline |
| `LoginPage.tsx` | ~2 | Inline |
| `DashboardPage.tsx` | ~5 | Inline |
| `PlansPage.tsx` | ~8 | Inline, notas de limite |
| `NotificationPreferencesPage.tsx` | ~2 | Inline |
| `TimesheetsPage.tsx` | ~15 | Inline, separadores |
| `GanttSettingsPage.tsx` | ~8 | Inline |
| `UserTypesPage.tsx` | ~5 | Inline |
| `SessionsPage.tsx` | ~8 | Inline |
| `ProjectPermissionsPage.tsx` | ~20 | Inline, notas de permissão |

#### 1.2 Componentes (`frontend/src/components/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `AppLayout.tsx` | ~30 | Inline, notas de lifecycle, separadores |
| `ProtectedRoute.tsx` | ~3 | Inline |
| `PlatformConfigPanel.tsx` | ~2 | Inline |
| `TimezoneSelect.tsx` | ~5 | Inline |
| `ProjectTimezoneBadge.tsx` | ~4 | Inline |

#### 1.3 Contextos (`frontend/src/contexts/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `AuthContext.tsx` | ~8 | Inline, JSDoc |
| `ToastContext.tsx` | ~5 | Inline |
| `ProjectDateFormatContext.tsx` | ~12 | Inline, notas de fallback |
| `TimezoneContext.tsx` | ~15 | Inline, notas de hierarquia binária |

#### 1.4 Hooks (`frontend/src/hooks/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `useFeatureFlag.ts` | ~5 | Inline |
| `useGanttConfig.ts` | ~8 | Inline, notas de resolução |
| `usePendingInvitations.ts` | ~6 | Inline |
| `useNotifications.ts` | ~1 | Inline |
| `useProjectPermissions.ts` | ~18 | Inline, notas de cache |

#### 1.5 Biblioteca (`frontend/src/lib/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `dateFormatting.ts` | ~94 | JSDoc, inline PT, notas de conversão, separadores |
| `api.ts` | ~3 | Inline |
| `confirm.ts` | ~10 | Inline, notas de pattern Swal |
| `avatar.ts` | ~6 | Inline |

#### 1.6 i18n (`frontend/src/i18n/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `index.ts` | ~1 | Inline |

#### 1.7 Feature — Planning / Gantt (`frontend/src/features/planning/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `ganttHelpers.ts` | ~40 | Inline, notas de drag&drop, stale closures, conversão datas |
| `ganttDateUtils.ts` | ~22 | Inline, notas wire format |
| `usePlanningData.ts` | ~1 | Inline |
| `usePlanningStates.ts` | ~8 | Inline |
| `states-types.ts` | ~5 | Inline |
| `components/TaskModal.tsx` | ~25 | Inline, notas de FlatPickr |
| `components/StateBadge.tsx` | ~5 | Inline |
| `components/StatesManagerPanel.tsx` | ~12 | Inline |
| `components/toolbar.css` | ~15 | Blocos CSS (ver secção CSS) |

#### 1.8 Feature — Board (`frontend/src/features/board/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `BoardView.tsx` | ~132 | **ALTO** — inline PT extenso, separadores `// ──`, notas de widget uncontrolled, history stack, handler sync |
| `useBoardData.ts` | ~18 | Inline, notas de mutação |
| `useBoardConfig.ts` | ~10 | Inline |
| `useBoardInit.ts` | ~35 | Inline, notas de singleton, stale closures |
| `types.ts` | ~8 | Inline, JSDoc de tipos |
| `components/BoardColumnModal.tsx` | ~8 | Inline |
| `components/BoardDeleteColumnModal.tsx` | ~5 | Inline |
| `components/BoardConfigPanel.tsx` | ~10 | Inline |

#### 1.9 Feature — Awesome-Kanban (`frontend/src/features/awesome-kanban/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `AwesomeKanban.tsx` | ~92 | Inline PT, JSDoc, separadores, notas de API |
| `types.ts` | ~72 | JSDoc extenso, documentação de tipos, notas de compatibilidade |
| `core/eventBus.ts` | ~2 | Inline |
| `core/cardRenderer.ts` | ~15 | Inline, notas de DOM manipulation |
| `core/stateManager.ts` | ~20 | Inline, notas de sincronização |

#### 1.10 Feature — Calendar (`frontend/src/features/calendar/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `useCalendarInit.ts` | ~59 | Inline PT, notas de singleton, stale closures, callbacks |
| `useCalendarData.ts` | ~22 | Inline, notas de fetch |
| `useCalendarConfig.ts` | ~12 | Inline, notas de resolução |
| `types.ts` | ~18 | JSDoc, inline |
| `components/CalendarSourcesPanel.tsx` | ~15 | Inline |
| `components/CalendarHeader.tsx` | ~8 | Inline |
| `components/CalendarEventModal.tsx` | ~20 | Inline, notas de FlatPickr |
| `components/CalendarEventTypesPanel.tsx` | ~12 | Inline |

#### 1.11 Feature — Timesheet (`frontend/src/features/timesheet/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `components/TimesheetView.tsx` | ~65 | **ALTO** — inline PT, separadores, notas de layout |
| `components/TimesheetCell.tsx` | ~65 | **ALTO** — inline PT, notas de input type="text" vs number, bumpHalf, POST vs PATCH |
| `dateUtils.ts` | ~63 | Inline PT, notas de UTC, ISO 8601 |
| `components/TimesheetMonthView.tsx` | ~48 | Inline, notas de FullCalendar dayGridMonth |
| `components/TimesheetTeamPersonHeader.tsx` | ~35 | Inline, notas de condições de botões |
| `useTimesheetData.ts` | ~28 | Inline, notas de optimistic update |
| `useTimesheetTeam.ts` | ~20 | Inline |
| `useTimesheetCalendar.ts` | ~18 | Inline |
| `useTimesheetGlobal.ts` | ~15 | Inline |
| `types.ts` | ~25 | JSDoc, inline, enums espelho |
| `components/TimesheetGrid.tsx` | ~22 | Inline |
| `components/TimesheetWeekHeader.tsx` | ~15 | Inline |
| `components/TimesheetStatusFilters.tsx` | ~10 | Inline |
| `components/TimesheetTeamSidebar.tsx` | ~18 | Inline |
| `components/TimesheetAddEntryModal.tsx` | ~12 | Inline |
| `components/TimesheetCopyWeekModal.tsx` | ~10 | Inline |
| `components/TimesheetRejectDayModal.tsx` | ~14 | Inline |
| `components/TimesheetRejectWeekModal.tsx` | ~8 | Inline |
| `components/TimesheetHistoryModal.tsx` | ~10 | Inline |
| `components/TimesheetGlobalFilters.tsx` | ~8 | Inline |
| `components/TimesheetMyTable.tsx` | ~10 | Inline |
| `components/TimesheetApprovalsTable.tsx` | ~12 | Inline |
| `components/TimesheetRejectionBanner.tsx` | ~5 | Inline |
| `components/TimesheetStatusPill.tsx` | ~3 | Inline |
| `components/TimesheetSubTabs.tsx` | ~4 | Inline |

#### 1.12 Feature — Notifications (`frontend/src/features/notifications/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `types.ts` | ~12 | JSDoc, inline |

---

### 2. Backend — NestJS / TypeScript (`backend/src/`)

#### 2.1 Módulo Auth

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `auth/auth.service.ts` | ~10 | Inline, notas de JWT |
| `auth/auth.controller.ts` | ~5 | Inline |
| `auth/jwt.strategy.ts` | ~6 | Inline |
| `auth/guards/jwt-auth.guard.ts` | ~3 | Inline |
| `auth/guards/profiles.guard.ts` | ~1 | Inline |
| `auth/guards/plan-limit.guard.ts` | ~8 | Inline, notas de plano |
| `auth/guards/feature-flag.guard.ts` | ~5 | Inline |

#### 2.2 Módulo Users

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `users/users.service.ts` | ~39 | Inline PT, notas de selfRegistered, patch pattern |
| `users/users.controller.ts` | ~8 | Inline |
| `users/dto/` (vários) | ~12 total | Inline, JSDoc de validação |

#### 2.3 Módulo Projects

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `projects/projects.service.ts` | ~45 | Inline PT, notas de convites, ownership |
| `projects/projects.controller.ts` | ~12 | Inline |
| `projects/project-permissions.ts` | ~37 | Inline PT, notas de defaults e delegabilidade |
| `projects/project-permissions.service.ts` | ~65 | **ALTO** — inline PT, notas de resolução, fluxo de grant |
| `projects/project-permissions.controller.ts` | ~10 | Inline |
| `projects/invitations.service.ts` | ~15 | Inline |
| `projects/guards/project-permission.guard.ts` | ~8 | Inline |
| `projects/dto/` (vários) | ~15 total | Inline, notas de validação |

#### 2.4 Módulo Planning

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `planning/planning.service.ts` | ~59 | Inline PT, notas de endDate, business days |
| `planning/planning.controller.ts` | ~10 | Inline |
| `planning/business-days.util.ts` | ~36 | Inline PT, notas de algoritmo, edge cases |
| `planning/states/states.service.ts` | ~118 | **ALTO** — inline PT, notas de sequencing, transações |
| `planning/states/states.controller.ts` | ~8 | Inline |
| `planning/dto/` (vários) | ~20 total | Inline |

#### 2.5 Módulo Gantt

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `gantt/gantt.service.ts` | ~15 | Inline, notas de formato DHTMLX |
| `gantt/gantt.controller.ts` | ~5 | Inline |
| `gantt-config/gantt-config.service.ts` | ~20 | Inline, notas de resolução 3 níveis |
| `gantt-config/gantt-config.controller.ts` | ~6 | Inline |

#### 2.6 Módulo Holidays

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `holidays/holidays.service.ts` | ~25 | Inline PT, notas de UTC midnight, usage tracking |
| `holidays/holidays.controller.ts` | ~8 | Inline |
| `holidays/dto/` | ~8 total | Inline |

#### 2.7 Módulo Board

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `board/board.service.ts` | ~22 | Inline PT, notas de lazy init colunas |
| `board/board.controller.ts` | ~8 | Inline |
| `board-config/board-config.service.ts` | ~18 | Inline, notas de deepMerge |
| `board-config/board-config.controller.ts` | ~5 | Inline |

#### 2.8 Módulo Calendar

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `calendar/calendar.service.ts` | ~35 | Inline PT, notas de lazy init tipos sistema, dedup holidays |
| `calendar/calendar.controller.ts` | ~10 | Inline |
| `calendar-config/calendar-config.service.ts` | ~15 | Inline, notas de resolução |
| `calendar-config/calendar-config.controller.ts` | ~5 | Inline |

#### 2.9 Módulo Timesheet

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `timesheet/timesheet.service.ts` | ~174 | **ALTÍSSIMO** — inline PT extenso, notas de REQ-*, transações, recomputeWeekStatus, auditoria, notificações |
| `timesheet/timesheet.controller.ts` | ~15 | Inline |
| `timesheet/timesheet-global.controller.ts` | ~12 | Inline |
| `timesheet/dto/` (vários) | ~25 total | Inline, JSDoc de validação, notas de REQ |

#### 2.10 Módulo Notifications

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `notifications/notifications.service.ts` | ~28 | Inline PT, notas de shouldNotify, fire-and-forget |
| `notifications/notifications.controller.ts` | ~8 | Inline |
| `notifications/dto/` | ~8 total | Inline |

#### 2.11 Módulo Feature Flags

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `feature-flags/feature-flags.service.ts` | ~20 | Inline PT, `NOTE:` sobre JWT (linhas 115, 148) |
| `feature-flags/feature-flags.controller.ts` | ~5 | Inline |

#### 2.12 Módulo Teams, Plans, Usage, i18n, Prisma

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `teams/teams.service.ts` | ~12 | Inline |
| `plans/plans.service.ts` | ~18 | Inline, notas de DISCONTINUED |
| `usage/usage.service.ts` | ~8 | Inline |
| `i18n/i18n.service.ts` | ~36 | Inline PT, notas de namespaces, seed v2 |
| `prisma/prisma.service.ts` | ~5 | Inline |

#### 2.13 Utilitários Comuns (`backend/src/common/`)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `common/timezone/timezone.util.ts` | ~22 | Inline PT, notas de IANA, edge cases DST |
| `common/decorators/` (vários) | ~10 total | Inline |

---

### 3. CSS Custom (excluindo vendor)

| Ficheiro | Estimativa de linhas | Tipos de comentário |
|----------|---------------------|---------------------|
| `frontend/src/features/awesome-kanban/styles/awesome-kanban.css` | ~73 | Blocos `/* Component */`, separadores de secção |
| `frontend/src/features/timesheet/timesheet.css` | ~54 | Blocos de tokens, separadores, notas de estado |
| `frontend/public/assets/css/calendar-zynix.css` | ~27 | Blocos de secção, overrides FullCalendar |
| `frontend/public/assets/css/icons.css` | ~16 | Blocos de origem/licença, separadores |
| `frontend/src/features/planning/components/toolbar.css` | ~15 | Blocos de componente, separadores |
| `frontend/src/index.css` | ~2 | Blocos de reset |
| `frontend/src/features/awesome-kanban/styles/reset.css` | ~1 | Bloco de origem |
| `frontend/src/features/awesome-kanban/styles/density.css` | ~1 | Bloco de variante |

---

## Prioridade de Execução

Ordenar por impacto (volume × exposição em build):

### Prioridade 1 — Crítico (ficheiros com maior volume em áreas compiladas)

1. `backend/src/timesheet/timesheet.service.ts` (~174 linhas)
2. `backend/src/planning/states/states.service.ts` (~118 linhas)
3. `frontend/src/pages/PlanningPage.tsx` (~147 linhas)
4. `frontend/src/features/board/BoardView.tsx` (~132 linhas)
5. `frontend/src/features/awesome-kanban/AwesomeKanban.tsx` (~92 linhas)
6. `frontend/src/features/awesome-kanban/types.ts` (~72 linhas)
7. `frontend/src/lib/dateFormatting.ts` (~94 linhas)
8. `backend/src/projects/project-permissions.service.ts` (~65 linhas)
9. `frontend/src/features/timesheet/components/TimesheetView.tsx` (~65 linhas)
10. `frontend/src/features/timesheet/components/TimesheetCell.tsx` (~65 linhas)

### Prioridade 2 — Alto (ficheiros com volume médio-alto)

11. `frontend/src/features/timesheet/dateUtils.ts` (~63 linhas)
12. `frontend/src/features/calendar/useCalendarInit.ts` (~59 linhas)
13. `backend/src/planning/planning.service.ts` (~59 linhas)
14. `frontend/src/features/timesheet/components/TimesheetMonthView.tsx` (~48 linhas)
15. `frontend/src/features/board/useBoardInit.ts` (~35 linhas)
16. `backend/src/planning/business-days.util.ts` (~36 linhas)
17. `backend/src/i18n/i18n.service.ts` (~36 linhas)
18. `frontend/src/features/timesheet/components/TimesheetTeamPersonHeader.tsx` (~35 linhas)
19. `backend/src/projects/project-permissions.ts` (~37 linhas)
20. `backend/src/common/timezone/timezone.util.ts` (~22 linhas)

### Prioridade 3 — CSS

21. `frontend/src/features/awesome-kanban/styles/awesome-kanban.css` (~73 linhas)
22. `frontend/src/features/timesheet/timesheet.css` (~54 linhas)
23. `frontend/public/assets/css/calendar-zynix.css` (~27 linhas)
24. `frontend/public/assets/css/icons.css` (~16 linhas)
25. `frontend/src/features/planning/components/toolbar.css` (~15 linhas)

### Prioridade 4 — Restantes

Todos os outros ficheiros listados nas secções 1 e 2 acima, com 1–20 linhas de comentários.

---

## Procedimento de Limpeza

### TypeScript / TSX

```bash
# Verificar comentários num ficheiro antes de remover
grep -n "\/\/" <ficheiro>
grep -n "\/\*" <ficheiro>
```

**Regras ao remover:**
1. Remover todos os `// comentário` — incluindo separadores `// ──`
2. Remover todos os blocos `/* … */` e `/** … */`
3. Remover comentários HTML `<!-- … -->` em TSX
4. **Nunca remover** `// eslint-disable`, `// @ts-ignore`, `// @ts-expect-error` — são directivas de ferramenta, não comentários de documentação
5. **Nunca remover** `'use strict'` ou directivas similares
6. Verificar que a remoção não quebra nenhuma lógica (comentários `//` no meio de expressões multi-linha são raros mas possíveis)

### CSS

**Regras ao remover:**
1. Remover todos os `/* … */` que sejam documentação ou separadores de secção
2. **Manter** comentários que sejam obrigatórios para ferramentas (ex: `/* autoprefixer: … */`, `/* stylelint-disable */`)
3. Verificar que cabeçalhos de ficheiros CSS de terceiros integrados (ex: `icons.css`) não têm licenças obrigatórias — se tiverem, manter numa linha única `/* License: MIT */`

### Verificação pós-limpeza

```bash
# Verificar se ainda existem comentários no frontend (src apenas)
grep -rn "\/\/" frontend/src/ --include="*.ts" --include="*.tsx" | grep -v "eslint" | grep -v "@ts-"

# Verificar backend
grep -rn "\/\/" backend/src/ --include="*.ts" | grep -v "eslint" | grep -v "@ts-"

# Verificar CSS custom
grep -rn "\/\*" frontend/src/ --include="*.css"
grep -n "\/\*" frontend/public/assets/css/calendar-zynix.css
grep -n "\/\*" frontend/public/assets/css/icons.css
```

---

## Configuração de Build para Garantia Futura

### Frontend (Vite + Terser)

Adicionar ao `vite.config.ts` para garantir remoção automática em produção:

```typescript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
    format: {
      comments: false,   // remove TODOS os comentários, incluindo /*! */
    },
  },
}
```

### Backend (TypeScript `tsconfig`)

Verificar / adicionar ao `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "removeComments": true
  }
}
```

> Com `removeComments: true`, o compilador TypeScript elimina todos os comentários
> do output `dist/`. Esta é a garantia de último recurso — mas a limpeza manual
> continua recomendada para evitar que comentários sensíveis cheguem a source maps.

---

## Métricas do Audit

| Categoria | Ficheiros auditados | Ficheiros com comentários | Estimativa linhas |
|-----------|:-------------------:|:------------------------:|:-----------------:|
| Frontend TSX/TS | 148 | 129 (87%) | ~1 800 |
| Backend TS | 191 | 107 (56%) | ~1 350 |
| CSS custom | 9 | 9 (100%) | ~189 |
| **Total** | **348** | **245 (70%)** | **~3 339** |

---

*Documento gerado em 2026-05-04. Rever após cada sprint que adicione ficheiros novos.*
