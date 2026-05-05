# Claude: carregar para tarefas de arquitectura, estrutura e infra

## Estrutura de diretórios

```
Awesome-Project-App/
├── backend/src/
│   ├── main.ts                  # Bootstrap: /api, Helmet, ValidationPipe, CORS
│   ├── app.module.ts            # Módulo raiz — todos os módulos registados aqui
│   ├── auth/                    # Login, JWT guard, /auth/me, guards/, decorators/
│   ├── users/                   # CRUD utilizadores
│   ├── profiles/                # Perfis (read-only via API)
│   ├── user-types/              # Tipos funcionais
│   ├── teams/                   # Equipas + membros
│   ├── projects/                # Projetos + equipas + membros + convites
│   ├── plans/                   # Planos comerciais
│   ├── feature-flags/           # Feature flags + resolução
│   ├── usage/                   # Usage tracking
│   ├── planning/                # CRUD tarefas Gantt, links, recursos, horas
│   ├── gantt/                   # GET dados DHTMLX (protegido por feature flag)
│   ├── gantt-config/            # Configuração Gantt (3 níveis: GLOBAL/USER/PROJECT)
│   ├── holidays/                # Feriados por utilizador (importa FeatureFlagsModule + UsageModule)
│   ├── board/                   # Board/Kanban: colunas, cartões, assignees (protegido por feature flag)
│   ├── board-config/            # Configuração Board (3 níveis: GLOBAL/USER/PROJECT)
│   ├── calendar/                # Calendário do projecto: eventos, tipos, agregado
│   ├── calendar-config/         # Configuração Calendar (3 níveis)
│   ├── timesheet/               # Timesheet: entries, weeks, days, audit log (project + global controllers)
│   ├── notifications/           # Notificações in-app + preferências
│   └── prisma/                  # PrismaService (módulo global)
├── backend/prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
├── frontend/src/
│   ├── App.tsx                  # Rotas: /login (público), / → /dashboard (protegido)
│   ├── lib/api.ts               # getApiBase() → '/api'
│   ├── contexts/                # AuthContext, ToastContext
│   ├── components/              # ProtectedRoute, AppLayout
│   ├── hooks/                   # useFeatureFlag, useGanttConfig, usePendingInvitations
│   ├── features/board/          # Board/Kanban: types, hooks, componentes
│   │   ├── types.ts             # IBoardColumn, IBoardCard, BoardConfigData, KanbanInstance
│   │   ├── useBoardData.ts      # fetch GET /board + mutações (move, assign, colunas)
│   │   ├── useBoardConfig.ts    # config 3 níveis (padrão useGanttConfig)
│   │   ├── useBoardInit.ts      # singleton DHTMLX Kanban Pro, eventos, stale closures
│   │   └── components/          # BoardColumnModal, BoardDeleteColumnModal, BoardConfigPanel
│   ├── features/calendar/       # Calendário: types, hooks (data/config/init), modais, panel
│   ├── features/timesheet/      # Timesheet: types, hooks (data/team/global), grelha, modais, página global
│   │   ├── types.ts             # ITimesheetEntry/Day/Week, ITimesheetBundle, enums espelho
│   │   ├── useTimesheetData.ts  # fetch da semana + mutações (entries, submit, copy)
│   │   ├── useTimesheetTeam.ts  # vista do gestor: equipa + approve/reject
│   │   ├── useTimesheetGlobal.ts # página global: my-weeks + pending-approvals
│   │   ├── timesheet.css        # tokens visuais (status pills, ts-table, banner)
│   │   └── components/          # TimesheetGrid, TimesheetCell, TimesheetWeekHeader, ...
│   └── pages/                   # LoginPage, DashboardPage, UsersPage, TeamsPage,
│                                #   ProjectsPage, PlansPage, HolidaysPage, TimesheetsPage,
│                                #   GanttSettingsPage, UserTypesPage, PlanningPage
├── docker-compose.yml
├── CLAUDE.md
└── GANTT.md                     # Documentação completa DHTMLX Gantt
```

## Portas e rede Docker

| Serviço    | Porta                        |
|------------|------------------------------|
| Backend    | 3000                         |
| Frontend   | 5173                         |
| PostgreSQL | 5432 (interno à rede Docker) |

Rede: `awesome-project-app-network` (externa).
Comunicação: Backend→Postgres: `postgres:5432`; Frontend→Backend: proxy Vite em dev.

## Variáveis de ambiente

**Backend:**
```
NODE_ENV=development | PORT=3000
DATABASE_URL=postgresql://...@postgres:5432/awesome_project_db?schema=public
JWT_SECRET=... | JWT_EXPIRES_IN=1d
APP_ADMIN_NAME=... | APP_ADMIN_EMAIL=... | APP_ADMIN_PASSWORD=...
FRONTEND_ORIGIN=http://localhost:5173
```

**Frontend:**
```
VITE_API_URL=http://localhost:3000/api  (não usado directamente — usar getApiBase())
VITE_BACKEND_PORT=3000 | VITE_FRONTEND_PORT=5173
```

## Fases de desenvolvimento

| Fase | Descrição | Estado |
|------|-----------|--------|
| 1 | CRUD utilizadores, perfis, tipos funcionais | ✅ |
| 2 | CRUD equipas + membros | ✅ |
| 3 | CRUD projetos + equipas associadas | ✅ |
| 4 | Sistema de convites e membros de projeto | ✅ |
| 5 | Painel config plataforma (SMTP offcanvas) | ✅ |
| 6 | Fundação Gantt (modelos + PlanningModule + GanttModule) | ✅ |
| 6b | Integração DHTMLX Gantt Pro (UI, drag&drop, resources) | ✅ |
| 6c | Recursos externos no Gantt (contractors) | ✅ |
| 7 | Relações e consistência funcional | 🔲 pendente |
| 8 | Planos, Feature Flags, Usage Tracking | ✅ |
| 9 | Gestão de Feriados + integração Gantt | ✅ |
| 10 | Configuração Gantt em 3 níveis | ✅ |
| 11 | Board/Kanban (DHTMLX Kanban Pro, 3 colunas base, config 3 níveis) | ✅ |
| 12 | Timesheet (registo semanal, aprovação por dia/semana/mês, área global, auditoria) | 🚧 em curso |

## Sidebar — navegação do painel

| Secção | Item | Rota | Visível |
|--------|------|------|---------|
| Principal | Dashboard | `/dashboard` | Todos |
| Gestão | Utilizadores | `/users` | Todos |
| Gestão | Equipas | `/teams` | Todos |
| Gestão | Projetos | `/projects` | Todos |
| Gestão | Tipos de Utilizador | `/user-types` | Todos |
| Gestão | Feriados | `/holidays` | Todos |
| Gestão | Timesheets | `/timesheets` | Todos com flag `timesheet_view` (PLATFORM_ADMIN bypassa) |
| Plataforma | Planos | `/plans` | PLATFORM_ADMIN |
| Configurações > Componentes | Gantt | `/settings/gantt` | Todos |
| Sistema | Terminar sessão | (logout) | Todos |

# Relacionados: @docs/claude/backend.md @docs/claude/db.md
