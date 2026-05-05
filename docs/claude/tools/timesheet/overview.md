# Claude: carregar para qualquer tarefa do Timesheet

## O que é

Funcionalidade para registo semanal de horas de trabalho dos membros de
projecto, com aprovação por OWNER/PM (ou delegado) e auditoria imutável.

- Página principal (project-scoped): tab **"Timesheet"** dentro de
  `PlanningPage.tsx` (5º tab, depois de "Calendário").
- Página global (cross-project): `TimesheetsPage.tsx` em `/timesheets`, com
  dois modos — **"As minhas"** (próprias semanas) e **"Para aprovar"** (fila
  de aprovação centralizada para gestores).

> **Nada de DHTMLX nem FullCalendar**: a grelha é React puro. Sem widget
> externo, sem singleton, sem stale closures em `attachEvent`/`api.on`.

## Feature flag

- Flag `timesheet_view` controla acesso (UI + endpoint backend).
- `PLATFORM_ADMIN` bypassa sempre (UI não verifica flag para admin).
- Frontend: `useFeatureFlag('timesheet_view')` + `user.profileCode === 'PLATFORM_ADMIN'`.
- Backend: `FeatureFlagGuard` + `@RequireFeature('timesheet_view')` em
  ambos os controllers.

## Módulos backend

| Módulo | Responsabilidade |
|--------|-----------------|
| `TimesheetModule` | Entries, weeks, days, audit log — `src/timesheet/` |

Dois controllers expostos pelo mesmo módulo:
- `TimesheetController` — `/api/projects/:id/timesheets/*` (project-scoped, com `ProjectPermissionGuard`).
- `TimesheetGlobalController` — `/api/timesheets/*` (cross-project, validação de permissão dentro do service).

## Módulos frontend

| Ficheiro | Responsabilidade |
|----------|-----------------|
| `features/timesheet/types.ts` | Tipos TypeScript + enums espelho + tipos da vista mensal |
| `features/timesheet/useTimesheetData.ts` | Fetch da semana de um projecto + mutações (entries, submit, copy) |
| `features/timesheet/useTimesheetTeam.ts` | Vista semanal do gestor: equipa + approve/reject |
| `features/timesheet/useTimesheetCalendar.ts` | Vista mensal do gestor: agregado X/Y ou individual ✓/✗ |
| `features/timesheet/useTimesheetGlobal.ts` | Página global: my-weeks + pending-approvals + has-approval-access |
| `features/timesheet/timesheet.css` | Tokens visuais (status pills, ts-table, banner) |
| `features/timesheet/components/TimesheetGrid.tsx` | Grelha tasks×dias |
| `features/timesheet/components/TimesheetCell.tsx` | Célula individual (input/locked/rejected) |
| `features/timesheet/components/TimesheetWeekHeader.tsx` | Row 2 toolbar para "As minhas horas" |
| `features/timesheet/components/TimesheetStatusFilters.tsx` | Row 2 toolbar para "Equipa do projeto" |
| `features/timesheet/components/TimesheetSubTabs.tsx` | Sub-tabs `mine`/`team` |
| `features/timesheet/components/TimesheetStatusPill.tsx` | Pill por estado |
| `features/timesheet/components/TimesheetTeamSidebar.tsx` | Lista de pessoas (vista gestor) + entry "Vista agregada" em modo mensal |
| `features/timesheet/components/TimesheetMonthView.tsx` | Vista mensal (FullCalendar dayGridMonth + coluna SEMANA) |
| `features/timesheet/components/TimesheetTeamPersonHeader.tsx` | Summary card + ações de aprovação por pessoa |
| `features/timesheet/components/TimesheetRejectionBanner.tsx` | Banner vermelho com motivo |
| `features/timesheet/components/TimesheetAddEntryModal.tsx` | Modal "Adicionar lançamento" |
| `features/timesheet/components/TimesheetCopyWeekModal.tsx` | Modal "Copiar semana" |
| `features/timesheet/components/TimesheetRejectDayModal.tsx` | Modal "Rejeitar dia" (motivo obrigatório) |
| `features/timesheet/components/TimesheetRejectWeekModal.tsx` | Modal "Rejeitar semana" (área global) |
| `features/timesheet/components/TimesheetHistoryModal.tsx` | Modal histórico de aprovações |
| `features/timesheet/components/TimesheetGlobalFilters.tsx` | 3 dropdowns + filtro user condicional |
| `features/timesheet/components/TimesheetMyTable.tsx` | Tabela "As minhas" (página global) |
| `features/timesheet/components/TimesheetApprovalsTable.tsx` | Tabela "Para aprovar" (página global) |

## Permissões

| Acção | OWNER | CONTRIBUTOR | READER | Delegável |
|-------|:-----:|:-----------:|:------:|:---------:|
| `TIMESHEET_LOG` | ✓ | ✓ | ✓ | ✓ |
| `TIMESHEET_APPROVE` | ✓ | — | — | ✓ |

- `TIMESHEET_LOG` permite lançar/editar/submeter/copiar **as próprias** horas. É
  default para todos os roles (incluindo READER, conforme REQ-P03/P04/P05/P06).
- `TIMESHEET_APPROVE` permite ver as horas de toda a equipa e aprovar/rejeitar.
  Default só OWNER. Delegável a qualquer membro (REQ-P25). Não é transitiva
  (REQ-P28) — quem recebe não tem `PERMISSIONS_MANAGE`.
- `READER` sem `TIMESHEET_LOG` (caso seja revogado) vê a grelha em modo
  read-only.

## Estados — Semana

| Estado | Quem transita | Quando |
|--------|---------------|--------|
| `DRAFT` | sistema | Estado inicial; ainda não submetida |
| `SUBMITTED` | utilizador (submit) | ≥1 dia SUBMITTED (gestor ainda não terminou a revisão) |
| `PARTIAL` | sistema (after approve/reject) | **≥1 aprovado AND ≥1 rejeitado**, sem SUBMITTED pendente |
| `APPROVED` | aprovador | Todos os dias com lançamentos aprovados; semana bloqueada permanentemente (REQ-T05) |
| `REJECTED` | aprovador | Todos os dias com lançamentos rejeitados, nenhum aprovado |

A transição é sempre **derivada** dos `TimesheetDay` em `recomputeWeekStatus()`
após cada mutação no `TimesheetService`.

> **Regra crítica (Abril 2026)**: o estado `PARTIAL` reflecte exclusivamente
> o resultado do processo de aprovação — **só aparece quando ≥1 dia foi
> aprovado E ≥1 foi rejeitado pelo gestor**. Dias sem lançamento são ignorados
> pelo sistema: não contam como pendentes, não bloqueiam submissão e não
> influenciam o estado da semana. O utilizador submete o que preencheu e o
> gestor aprova com base no contexto que conhece do projecto.

## Estados — Dia

| Estado do DIA | weekStatus DRAFT/REJECTED | weekStatus SUBMITTED/PARTIAL/APPROVED |
|---------------|:--:|:--:|
| `DRAFT`       | ✓ editável | ✗ bloqueado (`WEEK_LOCKED`) |
| `REJECTED`    | ✓ editável (resubmissão) | ✓ editável (resubmissão) |
| `SUBMITTED`   | ✗ bloqueado (`DAY_LOCKED`) | ✗ bloqueado |
| `APPROVED`    | ✗ bloqueado (REQ-G08, REQ-S04) | ✗ bloqueado |

**Bloqueio de DRAFT enquanto a semana está em revisão**: depois do utilizador
submeter a semana, dias que ficaram em branco (DRAFT, sem entries) também ficam
bloqueados — a UI esconde o input e o backend rejeita `POST /entries` com
`WEEK_LOCKED`. O utilizador tem de clicar "Editar semana" (unsubmit) para
voltar a poder mexer. Excepção: dias `REJECTED` continuam editáveis (fluxo de
resubmissão pós-rejeição, REQ-T07–T10).

**Resubmissão pós-rejeição** (REQ-T07–T10): o utilizador edita os dias `REJECTED`,
chama `submit-week` que move APENAS os `REJECTED` (e quaisquer `DRAFT` novos)
para `SUBMITTED`. Os dias `APPROVED` mantêm-se intocados.

**Editar semana submetida** (Abril 2026): enquanto a semana está em `SUBMITTED`
(ainda não aprovada/rejeitada), o utilizador pode reverter os próprios dias
`SUBMITTED` para `DRAFT` chamando `POST /timesheets/unsubmit`. Dias `APPROVED`
ou `REJECTED` ficam imutáveis. UI: o botão "Submeter semana" da toolbar dá
lugar a "Editar semana" (cor laranja) só quando `week.status === SUBMITTED`.
Em `APPROVED` nenhum botão é mostrado. Audit log com `action=REVERT,
scope=WEEK, actorId=self`. Sem notificações.

## Regras críticas

- **publicId everywhere**: rotas usam `entryId`, `userId`, `taskId`, todos
  `publicId` UUIDs.
- **Lazy-create**: `TimesheetWeek` e `TimesheetDay` são criados na primeira
  entry desse (user, projecto, semana) ou no primeiro `getWeek` (idempotente).
- **REQ-G20** (mesma task/dia agrega valor): unique
  `[projectId, userId, taskId, workDate]`. **`POST /entries`** (upsert) soma
  `hours + existing.hours` — usado pelo modal "Adicionar lançamento" e pela
  primeira edição duma célula vazia. **`PATCH /entries/:id`** **substitui** o
  valor — usado pela edição inline duma célula que já tem entry. A célula da
  grelha distingue: se `entry === null` faz POST; se `entry !== null` faz
  PATCH. Apagar a célula chama DELETE.
- **REQ-D01/D02/D03** (valores): `hours Decimal(5,2)`, mín `0.10`. Zero ou vazio
  ⇒ não cria registo (REQ-D02).
- **REQ-A06** (audit imutável): `TimesheetApprovalLog` sem update/delete no
  service. Cada submit/approve/reject escreve uma linha na mesma transação.
- **REQ-M06** (motivo obrigatório): `RejectDayDto.reason` valida `MinLength(1)`;
  service valida não-vazio antes do `prisma.create`.
- **REQ-M09** (mass approve scoped a 1 user): nunca há endpoint que aprove
  múltiplos utilizadores em simultâneo.
- **Notificações fire-and-forget**: `this.notificationsService.createTimesheet*(...).catch(() => {})`
  sempre que há transição de estado relevante.
- **Timezone**: dates DB em UTC midnight; cliente envia `YYYY-MM-DD`.
  `weekStartOf(date)` calcula segunda-feira em UTC (ISO 8601).
- **Decimal serialização**: Prisma devolve `Decimal` (string-ish); service
  converte para `number` na resposta DTO (mantém `Decimal` nas queries para
  precisão).
- **Permissões reactivas**: `useTimesheetData` aceita `canDoLog`, `canDoApprove`
  como booleans; UI gated diretamente por `canDo()` — sem `useRef` (não há
  callbacks DOM externos).
- **Área global só aprova SEMANA**: a fila `/timesheets` (tab "Para aprovar")
  só expõe approve/reject de **semana inteira**. Aprovação por DIA exige abrir
  o detalhe via vista do projecto.
- **Default subtab por role** (Abril 2026): ao entrar no tab Timesheet, o
  utilizador com `TIMESHEET_APPROVE` (gestor) começa em `subTab='team'`;
  contributor/reader começam em `subTab='mine'`. Aplicado uma única vez por
  sessão (ref flag) — escolhas posteriores do user não são sobrescritas.
- **`selfPublicId` vem do auth context, NÃO do bundle** (Abril 2026): o campo
  `member` no payload de `getWeek` é o **subject** (quem está a ser visto),
  não o requesting user. Usar `tsData.data.member.publicId` como
  `selfPublicId` causava bug onde, ao seleccionar X na sidebar do gestor, X
  desaparecia da lista (porque o filtro `r.user.publicId !== selfPublicId`
  passava a remover X). Fix: `selfPublicId = useAuth().user?.publicId`.
- **Vista mensal do gestor** (Abril 2026): em `subTab='team'` o gestor pode
  alternar entre **Mensal** (panorama — default) e **Semanal** (drill-down
  operacional) via toggle no toolbar. A vista mensal usa **FullCalendar
  dayGridMonth** com `validRange` derivado das datas do projecto. Cada célula
  mostra `X/Y` (utilizadores que lançaram / total da equipa) ou `✓/✗` (modo
  individual). Coluna SEMANA à direita resume cada semana com link de drill-down.
  Endpoint: `GET /api/projects/:id/timesheets/calendar?month=YYYY-MM[&userId=PUBLICID]`.
  Sidebar ganha entry **"Vista agregada"** no topo (apenas em mensal) que
  filtra entre agregado (X/Y) e individual (✓/✗).
- **Toda acção tem confirmação** (REQ Abril 2026): submit, approve (day/week/month),
  reject day, copy week e edit/revert passam por `confirmAction()` (helper baseado
  no Confirm Alert do template Zynix, sem ícone). Textos do alerta em i18n nos 4
  locales (`confirm.<action>.title/text/confirm`). Ver `frontend/src/lib/confirm.ts`.
- **Editar aprovação/rejeição** (REQ Abril 2026): quando uma semana já tem dias
  APPROVED/REJECTED (week status ≠ SUBMITTED/DRAFT), os botões "Aprovar / Rejeitar"
  são **ocultados** e em vez deles aparecem botões "Editar aprovação semana / mês".
  Ao confirmar, o backend reverte os dias APPROVED/REJECTED para SUBMITTED e cria
  uma linha em `TimesheetApprovalLog` com `action=REVERT`. O gestor pode então
  re-aprovar/re-rejeitar — gerando novas entradas de histórico.
- **Rejeição por dia com selector**: o modal "Rejeitar dia(s)" pede ao gestor
  qual dia rejeitar (entre os SUBMITTED) + motivo. Cada chamada é uma transacção
  separada → o gestor pode rejeitar dias diferentes com motivos diferentes.
  Para o utilizador, o `<TimesheetRejectionBanner>` renderiza um banner por dia
  rejeitado (cada um com o seu motivo).

## Ficheiros desta pasta

- @docs/claude/tools/timesheet/data-model.md — modelos Prisma, enums, endpoints REST
- @docs/claude/tools/timesheet/interactions.md — fluxos de submit/approve/reject/copy, transições de estado
- @docs/claude/tools/timesheet/rendering.md — layout, status pills, banner, modais

# Relacionados: @docs/claude/backend.md @docs/claude/db.md @docs/claude/frontend.md @docs/claude/permissions.md @docs/claude/notifications.md
