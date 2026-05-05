# Claude: carregar para tarefas de fluxos e interacções Timesheet

## Fluxo 1 — Lançar entry inline

1. UI: utilizador clica numa célula em estado editável (`DRAFT`/`REJECTED`).
2. Input ganha foco; valor inicial = `entry.hours` (ou vazio).
3. Validação local: `value >= 0.1` (REQ-D01) e `value` tem ≤ 1 casa decimal (REQ-D03).
4. `onBlur` ou `Enter` dispara `useTimesheetData.upsertEntry({ taskPublicId, workDate, hours, comment? })`.
5. Frontend chama `POST /api/projects/:id/timesheets/entries`.
6. Backend service:
   - `assertEditable(day)` — lança 403 se `day.status ∈ {SUBMITTED, APPROVED}`.
   - Lazy-create `TimesheetWeek` (status=DRAFT) se não existir.
   - Lazy-create `TimesheetDay` (status=DRAFT) se não existir.
   - Upsert `TimesheetEntry` por `(projectId, userId, taskId, workDate)`:
     - Se existe: `hours = existing.hours + dto.hours` (REQ-G20 — agrega). Se
       o caller quer **substituir** (ex.: edição inline directa), usa `PATCH`
       com `entryId` em vez de `POST`.
     - Caso contrário: cria.
7. Resposta `201 { entry }`.
8. Frontend: optimistic update já aplicado; revert em erro.

## Fluxo 2 — Adicionar lançamento via modal

REQ-G18 — botão CTA `+ Adicionar lançamento` (Row 1 da toolbar quando subtab=mine):

1. Modal `<TimesheetAddEntryModal>` abre.
2. Campos:
   - **Task** (Choices.js autocomplete sobre `data.tasks` do bundle).
   - **Dia da semana** (select com 7 opções, dia da semana actual default).
   - **Horas** (input numérico, step 0.1, min 0.1).
   - **Comentário** (textarea opcional).
3. Validação: task seleccionada + dia + horas ≥ 0.1.
4. Submit chama `useTimesheetData.upsertEntry(...)` (REQ-G20: se já existe, agrega).
5. Após sucesso: `refresh()` (re-fetch da semana) + toast `success.entry_saved` + fecha modal.

## Fluxo 3 — Submeter semana

REQ-G27/G28/G29/G30 — botão `Submeter semana` (Row 2 toolbar):

1. Frontend valida que há ≥ 1 dia com lançamentos editáveis (REQ-G31). Caso
   contrário, botão desactivado.
2. `POST /api/projects/:id/timesheets/submit` body `{ weekStart }`.
3. Backend service `submitWeek(projectId, userId, weekStart)`:
   - Lazy-resolve week.
   - Para cada `TimesheetDay` da semana com `status ∈ {DRAFT, REJECTED}` E
     com pelo menos 1 entry (REQ-D02): muda para `SUBMITTED`.
   - **Não toca** dias `APPROVED` (REQ-T08).
   - `recomputeWeekStatus(weekId)` → atualiza `week.status`.
   - Cria `TimesheetApprovalLog { action: SUBMIT|RESUBMIT, scope: WEEK, scopeDate: weekStart }`
     (RESUBMIT se já houve submissão anterior).
   - Resolve aprovadores (utilizadores com `TIMESHEET_APPROVE` neste projecto)
     via `ProjectPermissionsService.findUsersWithAction(projectId, TIMESHEET_APPROVE)`.
   - Por cada aprovador: `notificationsService.createTimesheetSubmittedNotification(...).catch(() => {})`.
4. Frontend: toast `success.week_submitted` + refresh.

## Fluxo 3b — Editar semana submetida (unsubmit)

Quando o utilizador submete a semana e ainda não foi aprovada, o botão
"Submeter semana" da toolbar dá lugar a um botão "Editar semana" (cor
laranja, destaque secundário). Permite reverter os próprios dias `SUBMITTED`
para `DRAFT` para correcção e nova submissão.

1. UI: botão "Editar semana" só aparece quando `timesheetWeekStatus === 'SUBMITTED'`.
   Para `APPROVED` nenhum dos dois botões aparece (semana imutável). Para
   `DRAFT/REJECTED/PARTIAL` mostra "Submeter semana".
2. Confirmação SweetAlert (`confirm.edit_own_week.*`).
3. `POST /api/projects/:id/timesheets/unsubmit` body `{ weekStart }` —
   `@RequireProjectPermission(TIMESHEET_LOG)`.
4. Backend service `unsubmitWeek(projectId, requesting, weekStart)`:
   - Para cada `TimesheetDay` da semana **do próprio utilizador** com
     `status === SUBMITTED`: muda para `DRAFT` (limpa `rejectedBy*`/`reason`
     defensivamente, embora SUBMITTED não os tenha).
   - **NÃO** toca `APPROVED` nem `REJECTED` — esses ficam imutáveis para o
     autor, só o aprovador (via `revert/week`) pode reverter.
   - Se já não há dias `SUBMITTED|APPROVED|REJECTED`: limpa `week.submittedAt`.
   - `recomputeWeekStatus(weekId)` → recalcula status agregado.
   - Se não havia dia SUBMITTED: 409 `NOTHING_TO_UNSUBMIT`.
   - Cria `TimesheetApprovalLog { action: REVERT, scope: WEEK, scopeDate: weekStart, actorId: self }`.
   - **Sem notificações** — é uma acção interna do próprio utilizador
     (aprovadores ainda não foram avisados; ou foram, mas o re-submit
     subsequente envia novamente uma notificação `RESUBMIT`).
5. Frontend: toast `success.week_unsubmitted` + refresh. As células voltam a
   ficar editáveis e o botão "Editar" volta a ser "Submeter".

## Fluxo 4 — Aprovar dia

REQ-P19/M04/M10:

1. UI (vista `team`, dentro do projecto): botão "Aprovar dia" no
   `<TimesheetTeamPersonHeader>` ou ícone na célula.
2. `POST /api/projects/:id/timesheets/approvals/day` body
   `{ userPublicId, workDate }`.
3. Backend service `approveDay(projectId, actorId, userId, workDate)`:
   - Resolve week (lazy-create se preciso, embora improvável após submit).
   - Encontra `TimesheetDay` por `(weekId, workDate)`.
   - Se `status !== SUBMITTED`: 409 (REQ-T04 — só aprova de SUBMITTED ou PARTIAL).
   - Update `{ status: APPROVED, approvedById: actorId, approvedAt: now() }`.
   - `recomputeWeekStatus(weekId)`.
   - Cria `TimesheetApprovalLog { action: APPROVE, scope: DAY, scopeDate: workDate }`.
   - Se nova `week.status === APPROVED`: notifica user (`createTimesheetApprovedNotification`).
   - Se nova `week.status === PARTIAL`: notifica user (`createTimesheetPartiallyApprovedNotification`).
4. Frontend: optimistic update + refresh.

## Fluxo 5 — Aprovar semana

REQ-P21/M07:

1. UI: botão "Aprovar semana" no `<TimesheetTeamPersonHeader>` (vista projecto)
   OU `[Aprovar]` inline no `<TimesheetApprovalsTable>` (área global).
2. `POST /api/projects/:id/timesheets/approvals/week` (project-scoped) ou
   `POST /api/timesheets/approvals/week` (global, body inclui `projectPublicId`).
3. Backend service `approveWeek(projectId, actorId, userId, weekStart)`:
   - Para todos os `TimesheetDay` com `status === SUBMITTED`: muda para `APPROVED`.
     **Não** toca dias DRAFT/APPROVED/REJECTED (idempotente).
   - `recomputeWeekStatus(weekId)`.
   - Cria 1 `TimesheetApprovalLog { action: APPROVE, scope: WEEK, scopeDate: weekStart }`.
   - Notifica user com base no novo `week.status` (`APPROVED` → `createTimesheetApprovedNotification`;
     `PARTIAL` → `createTimesheetPartiallyApprovedNotification`).

## Fluxo 6 — Aprovar mês

REQ-P22/M08/M09 — escopo a 1 user:

1. UI: botão "Aprovar mês" no header do projecto.
2. `POST /api/projects/:id/timesheets/approvals/month` body `{ userPublicId, year, month }` (`month` 1-12).
3. Backend service `approveMonth(projectId, actorId, userId, year, month)`:
   - Lista todas as `TimesheetWeek` cujo `weekStart` cai no mês (qualquer dia
     do `weekStart` entre 1º e último dia do mês — pode haver weeks
     parcialmente fora do mês; cobrimos só o que cai dentro).
   - Para cada week, aprova só os dias com `workDate` dentro do mês
     E `status === SUBMITTED`.
   - 1 `TimesheetApprovalLog` por week tocada `{ action: APPROVE, scope: MONTH, scopeDate: month-1st }`.
   - Notifica user 1× por week tocada.

## Fluxo 7 — Rejeitar dia (com selector)

REQ-P20/M06 — motivo obrigatório.
**Refinamento Abril 2026**: o modal pede QUAL dia rejeitar (entre os SUBMITTED),
não apenas o motivo. Cada chamada é uma transacção separada → o gestor pode
rejeitar dias diferentes com motivos diferentes (chama o modal várias vezes).

1. UI: o gestor clica "Rejeitar dia(s)" → abre `<TimesheetRejectDayModal>`.
2. O modal mostra:
   - **Select dos dias com `status=SUBMITTED`** da semana visualizada (lista vazia ⇒
     desactiva o submit e mostra `reject_day.no_submitted_days`).
   - Textarea para motivo (obrigatório — `reject.reason_required`).
3. Validação: `workDate` selecionado + `reason.trim().length > 0`.
4. `POST /api/projects/:id/timesheets/rejections/day` body
   `{ userPublicId, workDate, reason }`.
4. Backend service `rejectDay(projectId, actorId, userId, workDate, reason)`:
   - `MinLength(1)` no DTO (`class-validator`).
   - Service valida `reason.trim().length > 0` (defense-in-depth).
   - Update `TimesheetDay { status: REJECTED, rejectedById, rejectedAt, rejectionReason: reason }`.
   - `recomputeWeekStatus(weekId)`.
   - `TimesheetApprovalLog { action: REJECT, scope: DAY, scopeDate: workDate, reason }`.
   - `createTimesheetRejectedNotification(userId, ..., scopeDate=workDate, reason)`.

## Fluxo 7b — Editar aprovação/rejeição (revert)

**REQ Abril 2026**: quando uma semana já tem dias `APPROVED`/`REJECTED` (e nenhum
SUBMITTED pendente), os botões "Aprovar / Rejeitar" do `<TimesheetTeamPersonHeader>`
são ocultados e em vez deles aparecem **"Editar aprovação semana"** e **"Editar
aprovação mês"**.

1. UI: gestor clica "Editar aprovação semana" → confirmAction (variant=warning)
   pergunta confirmação — texto explica que será gerada nova entrada de histórico.
2. `POST /api/projects/:id/timesheets/revert/week` body `{ userPublicId, weekStart }`.
3. Backend service `revertWeek(...)`:
   - Lista todos os dias com `status ∈ {APPROVED, REJECTED}` na semana.
   - Se `length === 0`: 409 `NOTHING_TO_REVERT`.
   - Update todos para `status: SUBMITTED`, limpa `approvedBy/At` + `rejectedBy/At/Reason`.
   - Cria 1 `TimesheetApprovalLog{ action: REVERT, scope: WEEK, scopeDate: weekStart }`.
   - `recomputeWeekStatus(weekId)` → tipicamente devolve `SUBMITTED`.
4. Frontend: refresh; toast `success.week_reverted`. Os botões Aprovar/Rejeitar
   reaparecem; gestor pode rever.

`revertMonth` é análogo: itera por todas as weeks que tocam o mês, reverte só
os dias dentro do mês, cria 1 log por week tocada (`scope: MONTH`).

**Sem notificação ao user**: o revert é uma acção interna do gestor; o user só
volta a ser notificado quando o gestor re-aprovar/re-rejeitar.

## Vista mensal — macro-overview do gestor (Abril 2026)

A vista mensal é um modo alternativo dentro de `subTab='team'`, controlado por
um toggle **Mensal/Semanal** no toolbar. Default: **Mensal** (gestor entra com
panorama antes de actuar).

### Layout

- **FullCalendar dayGridMonth** à esquerda (área principal).
- **Coluna SEMANA** à direita (sibling, alinhada por flex stretch).
- **Sidebar** mantém-se à esquerda com a entry **"Vista agregada"** no topo
  (filtra entre agregado e individual).

### Estados visuais por célula

| Estado | Cor | Conteúdo (agregado) | Conteúdo (individual) |
|--------|-----|---------------------|------------------------|
| Complete | Verde | `X/Y` (X==Y) | `✓` |
| Partial  | Âmbar | `X/Y` (0<X<Y) | — |
| Pending  | Vermelho-claro | `0/Y` | `✗` |
| Future   | Branco | `X/Y` | `✓`/`✗` |
| Weekend  | Cinza-claro | `X/Y` (faded) | — |
| Out of range | Tracejado 135° | (vazio, não-interactivo) | — |

### Backend — endpoint

`GET /api/projects/:id/timesheets/calendar?month=YYYY-MM[&userId=PUBLICID]`

Permissão: `TIMESHEET_APPROVE`. Devolve um bundle de 42 dias (6 semanas) +
6 weeks summary + project range. Modo agregado vs individual é determinado
pela presença do query param `userId`.

Service: `getMonthCalendar(projectPublicId, monthIso, userPublicId?)`.
- `visibleStart` = segunda-feira da 1ª linha (pode ser do mês anterior).
- Para cada dia: aplica filtros (`outOfRange` via `Project.startDate/endDate`,
  `isWeekend`, `isFuture`, `inMonth`).
- Em modo agregado: `groupBy(userId, workDate)` para identificar quem lançou,
  contra `collectProjectMembers()` para o total.
- Em modo individual: filtra `userId` específico.
- `weeks[i].status` derivado dos `operativeDays` (não-fim-de-semana,
  não-out-of-range, não-futuro):
  - `complete`: todos os operativos têm `filledCount === totalCount` (ou `filled`)
  - `pending`: todos os operativos têm `filledCount === 0` (ou `!filled`)
  - `partial`: mistura
  - `future`/`out_of_range`/`mixed`: edge cases (semanas todo fora)

### Frontend — drill-down

Click num dia (não-outOfRange) ou na célula da coluna SEMANA →
`onDrillDownToWeek(weekStartIso)`:
1. `setTimesheetWeekStart(weekStartIso)`
2. `setTimesheetTeamView('weekly')`
3. `setTimesheetMonthIso(monthIsoOfWeek(weekStartIso))` (mantém alinhamento
   para quando o user voltar a Mensal)

### Frontend — toolbar mensal

Quando `subTab='team' && teamView='monthly'`:
- Toggle Mensal/Semanal (sub-tabs pill style)
- Nav mensal: prev / next / Hoje + label "Abril 2025" (`formatMonthLong`)
- Botões prev/next desabilitados quando `monthIsoWithinProject(prev|next, ...)`
  é false (i.e., o mês adjacente está fora do range do projecto).
- Sem chips de filtro de estado (só relevantes em weekly).

### Stale closure pattern

O `useTimesheetCalendar` segue padrão React puro — fetch + setState. Sem
DHTMLX/FullCalendar bus.

`TimesheetMonthView`, no entanto, usa FullCalendar com `dayCellDidMount` que
captura closure estática. Solução: `useRef` para `data` e `onDayClick`.
Re-aplicação de conteúdo via `useEffect([data])` que itera por
`[data-date]` e re-chama `applyCellState(...)`.

## Confirmações de acções

**REQ Abril 2026**: toda a acção do Timesheet passa por `confirmAction()`
(`frontend/src/lib/confirm.ts`) — helper baseado no Confirm Alert do template
Zynix (`A:/Arquivos/zynix_template/dist/html/sweet_alerts.html`), **sem ícone**.

Acções com confirmação obrigatória:
- Submeter semana → `confirm.submit_week.*`
- Copiar semana → `confirm.copy_week.*`
- Aprovar semana → `confirm.approve_week.*` (variant=success)
- Aprovar mês → `confirm.approve_month.*` (variant=success)
- Editar aprovação semana → `confirm.edit_week.*` (variant=warning)
- Editar aprovação mês → `confirm.edit_month.*` (variant=warning)

Excepções (já têm modal próprio que recolhe input):
- Rejeitar dia(s) — o modal pede dia + motivo, é a confirmação por si só.
- Adicionar lançamento — modal recolhe os campos.

Todos os textos (`title`, `text`, `confirm`, `cancel`) estão em i18n nos 4
locales (`pt-PT`, `pt-BR`, `en`, `es`). `cancel` reutiliza `common:actions.cancel`.

## Fluxo 8 — Rejeitar semana (área global apenas)

> Não existe endpoint project-scoped para rejeitar a semana inteira: dentro do
> projecto, o gestor rejeita dia-a-dia (granular). A área global expõe um shortcut.

1. UI: `[Rejeitar]` no `<TimesheetApprovalsTable>` abre `<TimesheetRejectWeekModal>`.
2. `POST /api/timesheets/rejections/week` body
   `{ projectPublicId, userPublicId, weekStart, reason }`.
3. Backend service `rejectWeekGlobal(projectPublicId, actorId, userId, weekStart, reason)`:
   - Resolve project, valida `TIMESHEET_APPROVE` neste projecto (lança 403 se falta).
   - Para cada `TimesheetDay` com `status === SUBMITTED`: marca como REJECTED com o **mesmo** `reason`.
   - `recomputeWeekStatus(weekId)` (geralmente fica `REJECTED` se nenhum APPROVED prévio).
   - **1 só** `TimesheetApprovalLog { action: REJECT, scope: WEEK, scopeDate: weekStart, reason }`.
   - 1 notificação `TIMESHEET_REJECTED` ao user.

## Fluxo 9 — Copiar semana

REQ-C01–C10:

1. UI: botão `Copiar semana` (Row 2 toolbar) abre `<TimesheetCopyWeekModal>`.
2. Campos:
   - **Semana de origem** (select, default = semana anterior à actual).
   - **Semana de destino** (select, default = semana actual).
   - **O que copiar** (radio):
     - `TASKS_ONLY` — só linhas, sem horas (default).
     - `TASKS_HOURS` — linhas + horas.
     - `TASKS_HOURS_COMMENTS` — linhas + horas + comentários.
3. `POST /api/projects/:id/timesheets/copy-week` body
   `{ fromWeekStart, toWeekStart, mode, overwrite?: false }`.
4. Backend service `copyWeek(...)`:
   - Resolve weeks. Destino tem de ter `status ∈ {DRAFT, REJECTED}` ou todos
     os dias editáveis (REQ-C09/C10) — caso contrário 409 `COPY_DESTINATION_LOCKED`.
   - Lê todas as entries da semana de origem (qualquer estado — REQ-C06).
   - Para cada entry origem:
     - Mapeia `workDate` adicionando `(toWeekStart - fromWeekStart)` em ms.
     - Calcula `hours` (mode=TASKS_ONLY ⇒ skip; outros ⇒ usa `entry.hours`).
     - Calcula `comment` (mode=TASKS_HOURS_COMMENTS ⇒ usa `entry.comment`; outros ⇒ null).
     - Verifica conflitos: se já existe entry destino para
       `(projectId, userId, taskId, newWorkDate)`:
       - `overwrite=false` (default) ⇒ skip a entry; counter `skippedCount++`.
       - `overwrite=true` ⇒ substitui horas/comentário.
     - Lazy-create `TimesheetWeek`/`TimesheetDay` destino conforme necessário.
   - Devolve `{ created, skipped }` para o frontend mostrar feedback.
5. Frontend: toast `success.week_copied` (com counter) + refresh.

## Fluxo 10 — Apagar entry

REQ-G24/G25:

1. UI: ícone "x" na célula (só visível se `day.status ∈ {DRAFT, REJECTED}`).
2. `DELETE /api/projects/:id/timesheets/entries/:entryId`.
3. Backend service `deleteEntry(projectId, userId, entryPublicId)`:
   - Resolve entry. Verifica `entry.userId === userId` (próprio) e
     `day.status ∈ {DRAFT, REJECTED}`.
   - Apaga entry (hard delete — não há semântica de soft-delete para entries).
   - Se foi a última entry desse dia: opcionalmente apagar `TimesheetDay`
     (deixar — não trás benefício e simplifica `recomputeWeekStatus`).

## Fluxo 11 — Apagar linha (todas as entries duma task na semana)

REQ-G24:

1. UI: botão "x" na primeira coluna da grelha (só visível se nenhuma célula
   da linha está em `SUBMITTED`/`APPROVED`).
2. `DELETE /api/projects/:id/timesheets/rows` body `{ taskPublicId, weekStart }`.
3. Backend valida que **todas** as entries dessa task na semana têm `day.status ∈ {DRAFT, REJECTED}`.
4. `deleteMany` em transação.

## Stale closures

A grelha do Timesheet é **React puro** — não há `attachEvent` (DHTMLX) nem
callbacks-em-config (FullCalendar). Logo, **não é necessário** o padrão
`useRef` para stale closures. Closures normais funcionam.

A excepção é se vier a integrar-se com algum widget externo no futuro —
nesse caso aplicar o padrão `xxxRef = useRef(xxx); useEffect(() => { ref.current = xxx; }, [xxx])`.

## Optimistic updates

- **upsertEntry**: aplica a mudança local imediatamente; em erro, reverte.
- **submitWeek**: NÃO usa optimistic — espera resposta do server (o backend
  decide quais dias movem para SUBMITTED). Refresh após resposta.
- **approveDay/approveWeek/rejectDay**: optimistic com revert em erro. UX
  importante porque o gestor revê em massa.
- **deleteEntry/deleteRow**: optimistic remove + revert em erro.

## Erros e códigos HTTP

| Código | Quando | DTO error code |
|--------|--------|----------------|
| 400 | DTO inválido (class-validator) | — |
| 401 | Sem JWT | — |
| 403 | Sem `TIMESHEET_LOG`/`TIMESHEET_APPROVE` | `FORBIDDEN` |
| 404 | week/day/entry não encontrado | `TIMESHEET_NOT_FOUND` |
| 409 | Tentar editar dia bloqueado (SUBMITTED/APPROVED) | `DAY_LOCKED` |
| 409 | Tentar adicionar entry a DRAFT day quando a semana está em revisão (SUBMITTED/PARTIAL) ou aprovada | `WEEK_LOCKED` |
| 409 | Tentar apagar linha com dia submetido | `ROW_HAS_SUBMITTED` |
| 409 | Tentar copy-week para destino bloqueado | `COPY_DESTINATION_LOCKED` |
| 409 | Tentar approve dia que não está SUBMITTED | `INVALID_DAY_STATUS` |

## Anti-padrões

- ❌ Aprovar/rejeitar sem criar `TimesheetApprovalLog` na mesma transação
- ❌ Notificar antes de a transição estar persistida (notificações fora da transaction)
- ❌ Update directo a `week.status` sem chamar `recomputeWeekStatus(weekId)`
- ❌ Permitir `hours = 0` ou negativo (REQ-D01/D02)
- ❌ Submeter semana sem dispar notificações aos aprovadores (REQ-N02/N05)
- ❌ Permitir delete/update no `TimesheetApprovalLog` (REQ-A06)
- ❌ Resubmeter dias `APPROVED` (REQ-T08 — não tocar)
- ❌ Endpoint global de approve/reject por dia — só semana

# Relacionados: @docs/claude/tools/timesheet/overview.md @docs/claude/tools/timesheet/data-model.md @docs/claude/notifications.md
