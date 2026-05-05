# Claude: carregar para tarefas de backend, API ou módulos NestJS

## Convenções NestJS

- Prefixo global `/api` — todos os controllers herdam.
- `ValidationPipe` global: `whitelist: true`, `forbidNonWhitelisted: true` — DTOs com `class-validator`.
- Novos módulos registados em `app.module.ts`.
- Passwords: bcrypt 10 rounds, nunca texto simples.
- Controllers usam `ParseUUIDPipe` para params. Services resolvem `publicId → id` no início de cada método.

## Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/hello | — | Healthcheck |
| POST | /api/auth/login | — | Login → JWT + user |
| GET | /api/auth/me | JWT | User autenticado |
| GET | /api/users | JWT | Lista utilizadores |
| POST/PATCH/DELETE | /api/users[/:id] | JWT + ADMIN | Criar/atualizar/soft-delete |
| GET | /api/profiles | JWT | Perfis (read-only) |
| GET/POST/PATCH/DELETE | /api/user-types[/:id] | JWT (ADMIN mutações) | Tipos funcionais |
| GET/POST/PATCH/DELETE | /api/teams[/:id] | JWT (ADMIN mutações) | CRUD equipas |
| POST/PATCH/DELETE | /api/teams/:id/members[/:userId] | JWT + ADMIN | Membros de equipa |
| GET/POST/PATCH/DELETE | /api/projects[/:id] | JWT (ADMIN mutações) | CRUD projetos |
| POST/DELETE | /api/projects/:id/teams[/:teamId] | JWT + ADMIN | Equipas do projeto |
| GET/POST/PATCH/DELETE | /api/projects/:id/members[/:memberId] | JWT (owner) | Membros/convites |
| GET | /api/invitations/pending | JWT | Convites pendentes |
| GET | /api/invitations | JWT | Todos os convites |
| POST | /api/invitations/:id/accept | JWT (próprio) | Aceitar convite |
| POST | /api/invitations/:id/decline | JWT (próprio) | Recusar convite |
| POST | /api/invitations/:id/resend | JWT (convidante) | Reenviar convite |
| GET/PATCH | /api/platform-config/email | JWT + ADMIN | Config SMTP (password nunca devolvida) |
| GET/POST/PATCH/DELETE | /api/plans[/:id] | JWT + ADMIN | Planos comerciais |
| POST/DELETE | /api/plans/:id/limits[/:limitId] | JWT + ADMIN | Limites EAV |
| POST/DELETE | /api/plans/:id/pricing[/:pricingId] | JWT + ADMIN | Pricing |
| POST/PATCH/DELETE | /api/plans/:id/feature-flags[/:pfId] | JWT + ADMIN | Flags do plano |
| POST | /api/plans/assign | JWT + ADMIN | Atribuir plano a utilizador |
| GET | /api/plans/users/:userId/history | JWT + ADMIN | Histórico de planos |
| GET/POST/PATCH/DELETE | /api/feature-flags[/:id] | JWT + ADMIN | Feature flags |
| POST/DELETE | /api/feature-flags/user-override[/:id] | JWT + ADMIN | Override por user |
| GET | /api/feature-flags/my-flags | JWT | Flags resolvidas do user |
| GET | /api/feature-flags/check/:key | JWT | Verificar flag específica |
| GET | /api/usage/my | JWT | Uso do utilizador |
| GET | /api/usage/users/:userId | JWT + ADMIN | Uso de user específico |
| GET/POST/PATCH/DELETE | /api/holidays[/:id] | JWT (owner/admin mutações) | CRUD feriados |
| POST/PATCH/DELETE | /api/holidays/:id/dates[/:dateId] | JWT (owner/admin) | Datas de feriados |
| GET/POST/DELETE | /api/projects/:id/holidays[/:holidayId] | JWT | Feriados do projeto |
| GET | /api/projects/:id/planning | JWT | Dados Gantt + nonWorkingDays |
| GET | /api/projects/:id/planning/gantt | JWT + gantt_view | Gantt (protegido por feature flag) |
| POST/PUT/DELETE | /api/projects/:id/planning/tasks[/:taskId] | JWT | Tarefas |
| POST/PUT/DELETE | /api/projects/:id/planning/links[/:linkId] | JWT | Dependências |
| GET/POST/PUT/DELETE | /api/projects/:id/planning/resources[/:resId] | JWT | Recursos |
| GET/PUT | /api/projects/:id/planning/member-hours[/:userId] | JWT | Horas/dia por membro |
| → | /api/gantt-config/* | JWT | Config Gantt 3 níveis — ver GANTT.md §3 |
| GET | /api/projects/:id/board | JWT + BOARD_VIEW + flag board_view | Board: colunas + cartões + assignees + membros (lazy init 3 estados base) |
| PATCH | /api/projects/:id/board/cards/:taskId/assignees | JWT + BOARD_CARD_ASSIGN + flag board_view | Substituir assignees. Body: `{ assigneePublicIds: string[] }` |
| GET | /api/projects/:id/planning/states | JWT + PROJECT_VIEW | Lista Estados (colunas) do projecto — sem flag `board_view` |
| POST | /api/projects/:id/planning/states | JWT + STATE_MANAGE | Criar Estado custom (INTERMEDIATE, isSystem: false) |
| PATCH | /api/projects/:id/planning/states/reorder | JWT + STATE_MANAGE | Reordenar Estados. Body: `{ orderedPublicIds: string[] }` |
| PATCH | /api/projects/:id/planning/states/:stateId | JWT + STATE_MANAGE | Editar Estado (`:stateId` = publicId) |
| DELETE | /api/projects/:id/planning/states/:stateId | JWT + STATE_MANAGE | Eliminar Estado (isSystem=true → 409). Body: `{ targetStatePublicId? }` se taskCount > 0 |
| PATCH | /api/projects/:id/planning/tasks/:taskId/state | JWT + TASK_EDIT | Muda estado duma tarefa. Body: `{ stateId: string \| null; position?: number }`. Faz re-sequencing das posições em transação |
| GET | /api/board-config/resolve | JWT | Config resolvido USER+GLOBAL |
| GET | /api/board-config/resolve/:projectId | JWT | Config resolvido PROJECT+USER+GLOBAL |
| GET/PUT | /api/board-config/global | JWT + ADMIN | Config GLOBAL (PLATFORM_ADMIN apenas) |
| GET/PUT | /api/board-config/user | JWT | Config USER do utilizador autenticado |
| GET/PUT | /api/board-config/project/:projectId | JWT + BOARD_CONFIG | Config PROJECT |
| GET | /api/projects/:id/timesheets/week?weekStart=&userId=? | JWT + TIMESHEET_LOG (próprio) ou TIMESHEET_APPROVE (qualquer) + flag timesheet_view | Bundle da semana (week+days+entries+tasks+member) |
| POST | /api/projects/:id/timesheets/entries | JWT + TIMESHEET_LOG | Upsert entry (REQ-G20: agrega se mesma task/dia) |
| PATCH | /api/projects/:id/timesheets/entries/:entryId | JWT + TIMESHEET_LOG | Editar horas/comentário; bloqueado se day=SUBMITTED/APPROVED |
| DELETE | /api/projects/:id/timesheets/entries/:entryId | JWT + TIMESHEET_LOG | Apagar entry editável |
| DELETE | /api/projects/:id/timesheets/rows | JWT + TIMESHEET_LOG | Body `{ taskPublicId, weekStart }` — apaga linha completa (REQ-G24) |
| POST | /api/projects/:id/timesheets/submit | JWT + TIMESHEET_LOG | Submeter semana → notifica aprovadores |
| POST | /api/projects/:id/timesheets/unsubmit | JWT + TIMESHEET_LOG | "Editar semana": reverte os próprios dias SUBMITTED→DRAFT (sem tocar APPROVED/REJECTED). Audit `REVERT/WEEK`, sem notificações |
| POST | /api/projects/:id/timesheets/copy-week | JWT + TIMESHEET_LOG | Copiar semana (3 modos REQ-C04) |
| GET | /api/projects/:id/timesheets/team?weekStart=&status= | JWT + TIMESHEET_APPROVE | Lista equipa + status semanal (REQ-M01–M03) |
| GET | /api/projects/:id/timesheets/calendar?month=YYYY-MM&userId=? | JWT + TIMESHEET_APPROVE | Vista mensal — agregado X/Y ou individual ✓/✗ (Abril 2026) |
| POST | /api/projects/:id/timesheets/approvals/day | JWT + TIMESHEET_APPROVE | Aprovar 1 dia (REQ-P19) |
| POST | /api/projects/:id/timesheets/approvals/week | JWT + TIMESHEET_APPROVE | Aprovar semana inteira (REQ-P21) |
| POST | /api/projects/:id/timesheets/approvals/month | JWT + TIMESHEET_APPROVE | Aprovar mês de 1 user (REQ-P22, M08, M09) |
| POST | /api/projects/:id/timesheets/rejections/day | JWT + TIMESHEET_APPROVE | Rejeitar dia com motivo obrigatório (REQ-M06) |
| POST | /api/projects/:id/timesheets/revert/week | JWT + TIMESHEET_APPROVE | "Editar aprovação semana" — reverte days APPROVED/REJECTED → SUBMITTED (Abril 2026) |
| POST | /api/projects/:id/timesheets/revert/month | JWT + TIMESHEET_APPROVE | "Editar aprovação mês" — reverte days APPROVED/REJECTED no mês de 1 user |
| GET | /api/projects/:id/timesheets/log?userId=&from=&to= | JWT + TIMESHEET_APPROVE (qualquer) ou TIMESHEET_LOG (próprio) | Audit trail (REQ-A04, A05) |
| GET | /api/timesheets/my?weekStart=&projectId=&status= | JWT + flag timesheet_view | Próprias semanas em todos os projectos (REQ-GL01–06) |
| GET | /api/timesheets/pending-approvals?weekStart=&projectId=&userId=&status= | JWT + flag timesheet_view | Filtrado por projectos com TIMESHEET_APPROVE (REQ-GL07–14) |
| GET | /api/timesheets/has-approval-access | JWT + flag timesheet_view | `{ hasAccess: boolean }` para gating da tab "Para aprovar" |
| POST | /api/timesheets/approvals/week | JWT + flag timesheet_view | Aprovação cross-project (resolve `projectPublicId` no body) |
| POST | /api/timesheets/rejections/week | JWT + flag timesheet_view | Rejeição de semana inteira com motivo |

## Módulos e localização

| Módulo | Path | Observação |
|--------|------|------------|
| Auth | `src/auth/` | jwt.strategy, guards/, decorators/ |
| Users | `src/users/` | |
| Projects | `src/projects/` | inclui invitations |
| Teams | `src/teams/` | |
| Plans | `src/plans/` | |
| FeatureFlags | `src/feature-flags/` | |
| Usage | `src/usage/` | |
| Planning | `src/planning/` | tarefas, links, recursos, horas |
| Gantt | `src/gantt/` | apenas GET dados DHTMLX |
| GanttConfig | `src/gantt-config/` | |
| Holidays | `src/holidays/` | importa FeatureFlagsModule + UsageModule |
| Board | `src/board/` | colunas, cartões, assignees — importa ProjectsModule, FeatureFlagsModule |
| BoardConfig | `src/board-config/` | config 3 níveis (padrão GanttConfig) |
| Calendar | `src/calendar/` | eventos, tipos, agregado read-only |
| CalendarConfig | `src/calendar-config/` | config 3 níveis |
| Timesheet | `src/timesheet/` | entries, weeks, days, audit log; expõe `TimesheetController` (project) + `TimesheetGlobalController` (cross-project). Importa ProjectsModule, FeatureFlagsModule, NotificationsModule |
| Notifications | `src/notifications/` | in-app + preferências |
| Prisma | `src/prisma/` | módulo global |

## Anti-padrões

- ❌ `prisma migrate dev` em produção (usar `migrate deploy`)
- ❌ Hard delete de registos (usar soft delete: `status: INACTIVE`)
- ❌ Expor `id` numérico na API (usar `publicId`)
- ❌ Novo módulo sem registar em `app.module.ts`

# Relacionados: @docs/claude/db.md @docs/claude/auth.md @docs/claude/tools/gantt/overview.md @docs/claude/tools/board/overview.md @docs/claude/tools/calendar/overview.md @docs/claude/tools/timesheet/overview.md
