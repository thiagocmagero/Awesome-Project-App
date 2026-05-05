# Claude: carregar para tarefas do modelo de dados Timesheet

## Enums Prisma

```prisma
enum TimesheetWeekStatus {
  DRAFT
  SUBMITTED
  PARTIAL
  APPROVED
  REJECTED
}

enum TimesheetDayStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
}

enum TimesheetLogScope { DAY  WEEK  MONTH }
enum TimesheetLogAction { SUBMIT  RESUBMIT  APPROVE  REJECT  REVERT }
```

## Modelos Prisma

### `TimesheetWeek`

Uma linha por (projecto, utilizador, semana). Lazy-create na primeira entry
ou primeiro `getWeek`. Campo `status` agregado é mantido pelo service (resultado
de `recomputeWeekStatus(weekId)`) para queries rápidas.

```prisma
model TimesheetWeek {
  id          Int                      @id @default(autoincrement())
  publicId    String                   @unique @default(uuid(7))
  projectId   Int
  userId      Int
  weekStart   DateTime                 // UTC midnight, segunda-feira ISO 8601
  status      TimesheetWeekStatus      @default(DRAFT)
  submittedAt DateTime?
  createdAt   DateTime                 @default(now())
  updatedAt   DateTime                 @updatedAt

  project     Project                  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user        User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  days        TimesheetDay[]
  entries     TimesheetEntry[]
  logs        TimesheetApprovalLog[]

  @@unique([projectId, userId, weekStart])
  @@index([userId, weekStart])
}
```

### `TimesheetDay`

Estado por dia dentro de uma semana. Lazy-create na primeira entry do dia.

```prisma
model TimesheetDay {
  id              Int                @id @default(autoincrement())
  publicId        String             @unique @default(uuid(7))
  weekId          Int
  workDate        DateTime           // UTC midnight
  status          TimesheetDayStatus @default(DRAFT)
  approvedById    Int?
  approvedAt      DateTime?
  rejectedById    Int?
  rejectedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  week            TimesheetWeek      @relation(fields: [weekId], references: [id], onDelete: Cascade)
  approvedBy      User?              @relation("TimesheetDayApproved", fields: [approvedById], references: [id], onDelete: SetNull)
  rejectedBy      User?              @relation("TimesheetDayRejected", fields: [rejectedById], references: [id], onDelete: SetNull)
  entries         TimesheetEntry[]

  @@unique([weekId, workDate])
}
```

### `TimesheetEntry`

Lançamento individual de horas. Unique `(projectId, userId, taskId, workDate)`
implementa REQ-G20 (mesma task/dia agrega valor).

```prisma
model TimesheetEntry {
  id          Int                 @id @default(autoincrement())
  publicId    String              @unique @default(uuid(7))
  projectId   Int
  userId      Int
  taskId      Int
  weekId      Int
  dayId       Int
  workDate    DateTime            // UTC midnight (denormalized de TimesheetDay.workDate)
  weekStart   DateTime            // UTC midnight (denormalized de TimesheetWeek.weekStart)
  hours       Decimal             @db.Decimal(5, 2)  // mín 0.10
  comment     String?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  project     Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  task        GanttTask           @relation(fields: [taskId], references: [id], onDelete: Restrict)
  week        TimesheetWeek       @relation(fields: [weekId], references: [id], onDelete: Cascade)
  day         TimesheetDay        @relation(fields: [dayId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId, taskId, workDate], name: "uq_entry")
  @@index([projectId, userId, weekStart])
  @@index([userId, workDate])
}
```

### `TimesheetApprovalLog`

Auditoria imutável (REQ-A01–A06). Service só expõe `create`. Sem `update`/`delete`.

```prisma
model TimesheetApprovalLog {
  id        Int                  @id @default(autoincrement())
  publicId  String               @unique @default(uuid(7))
  weekId    Int
  actorId   Int
  action    TimesheetLogAction
  scope     TimesheetLogScope
  scopeDate DateTime             // workDate (DAY) | weekStart (WEEK) | month-1st (MONTH)
  reason    String?              // obrigatório se action=REJECT (validado em service)
  createdAt DateTime             @default(now())

  week      TimesheetWeek        @relation(fields: [weekId], references: [id], onDelete: Cascade)
  actor     User                 @relation(fields: [actorId], references: [id], onDelete: Restrict)

  @@index([weekId, createdAt])
}
```

## NotificationType — 4 valores novos

```prisma
enum NotificationType {
  // ... existentes
  TIMESHEET_SUBMITTED
  TIMESHEET_APPROVED
  TIMESHEET_PARTIALLY_APPROVED
  TIMESHEET_REJECTED
}
```

| Tipo | Para quem | Quando |
|------|-----------|--------|
| `TIMESHEET_SUBMITTED` | Aprovadores | User submete semana — uma notificação por aprovador (REQ-N05) |
| `TIMESHEET_APPROVED` | User submetente | Semana fica APPROVED |
| `TIMESHEET_PARTIALLY_APPROVED` | User submetente | Semana fica PARTIAL |
| `TIMESHEET_REJECTED` | User submetente | Pelo menos 1 dia rejeitado; `body` inclui `reason` (REQ-N04) |

## ProjectAction — 2 valores novos

```typescript
TIMESHEET_LOG     = 'TIMESHEET_LOG',
TIMESHEET_APPROVE = 'TIMESHEET_APPROVE',
```

- `DEFAULT_PERMISSIONS.CONTRIBUTOR`: + `TIMESHEET_LOG`
- `DEFAULT_PERMISSIONS.READER`: + `TIMESHEET_LOG`
- `DELEGATABLE_ACTIONS`: + `TIMESHEET_LOG`, + `TIMESHEET_APPROVE`
- Novo `ActionGroup` `key: 'timesheet'` em `ACTION_GROUPS`

## Endpoints REST

### Project-scoped (`@RequireFeature('timesheet_view')` + `@UseGuards(JwtAuthGuard, FeatureFlagGuard, ProjectPermissionGuard)`)

| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/projects/:id/timesheets/week?weekStart=YYYY-MM-DD&userId=PUBLICID?` | `TIMESHEET_LOG` (próprio) ou `TIMESHEET_APPROVE` (qualquer) |
| POST | `/api/projects/:id/timesheets/entries` | `TIMESHEET_LOG` |
| PATCH | `/api/projects/:id/timesheets/entries/:entryId` | `TIMESHEET_LOG` (próprio) |
| DELETE | `/api/projects/:id/timesheets/entries/:entryId` | `TIMESHEET_LOG` (próprio) |
| DELETE | `/api/projects/:id/timesheets/rows` | `TIMESHEET_LOG` (próprio) |
| POST | `/api/projects/:id/timesheets/submit` | `TIMESHEET_LOG` |
| POST | `/api/projects/:id/timesheets/unsubmit` | `TIMESHEET_LOG` (próprio) — "Editar semana": reverte SUBMITTED→DRAFT (apenas o próprio user). Sem notificações |
| POST | `/api/projects/:id/timesheets/copy-week` | `TIMESHEET_LOG` |
| GET | `/api/projects/:id/timesheets/team?weekStart=&status=` | `TIMESHEET_APPROVE` |
| GET | `/api/projects/:id/timesheets/calendar?month=YYYY-MM&userId=?` | `TIMESHEET_APPROVE` — vista mensal (agregado X/Y ou individual ✓/✗) |
| POST | `/api/projects/:id/timesheets/approvals/day` | `TIMESHEET_APPROVE` |
| POST | `/api/projects/:id/timesheets/approvals/week` | `TIMESHEET_APPROVE` |
| POST | `/api/projects/:id/timesheets/approvals/month` | `TIMESHEET_APPROVE` |
| POST | `/api/projects/:id/timesheets/rejections/day` | `TIMESHEET_APPROVE` |
| POST | `/api/projects/:id/timesheets/revert/week` | `TIMESHEET_APPROVE` — reverte days APPROVED/REJECTED para SUBMITTED (Abril 2026) |
| POST | `/api/projects/:id/timesheets/revert/month` | `TIMESHEET_APPROVE` — idem para o mês de 1 user |
| GET | `/api/projects/:id/timesheets/log?userId=&from=&to=` | `TIMESHEET_APPROVE` (qualquer user) ou `TIMESHEET_LOG` (só próprio) |

### Global (cross-project, `@UseGuards(JwtAuthGuard, FeatureFlagGuard)` + `@RequireFeature('timesheet_view')`)

| Método | Rota | Notas |
|--------|------|-------|
| GET | `/api/timesheets/my?weekStart=&projectId=&status=` | Próprias semanas em todos os projectos acessíveis |
| GET | `/api/timesheets/pending-approvals?weekStart=&projectId=&userId=&status=` | Filtrado por projectos com `TIMESHEET_APPROVE` (resolução via `ProjectPermissionsService.resolveAll(userId)`) |
| GET | `/api/timesheets/has-approval-access` | `{ hasAccess: boolean }` — alimenta a tab "Para aprovar" |
| POST | `/api/timesheets/approvals/week` | Body inclui `projectPublicId`; service valida `TIMESHEET_APPROVE` no projecto-alvo |
| POST | `/api/timesheets/rejections/week` | Idem; rejeita semana inteira (todos os dias `SUBMITTED` → `REJECTED` com mesmo `reason`) |

> **Nota crítica de scope**: a área global **NUNCA** expõe approve/reject por
> dia. Aprovação granular exige abrir a vista do projecto.

## Payload `GET /timesheets/week`

```json
{
  "week": {
    "publicId": "...", "weekStart": "2025-04-14", "status": "PARTIAL",
    "submittedAt": "2025-04-15T10:30:00Z"
  },
  "days": [
    { "workDate": "2025-04-14", "status": "APPROVED", "approvedAt": "...", "approvedBy": { "publicId":"...", "name":"..." }, "rejectionReason": null },
    { "workDate": "2025-04-15", "status": "APPROVED", ... },
    { "workDate": "2025-04-16", "status": "REJECTED", "rejectedAt": "...", "rejectedBy": {...}, "rejectionReason": "As horas registadas não correspondem ao registo de acesso." },
    { "workDate": "2025-04-17", "status": "SUBMITTED", ... },
    { "workDate": "2025-04-18", "status": "DRAFT", ... }
  ],
  "entries": [
    { "publicId": "...", "taskPublicId": "...", "workDate": "2025-04-14", "hours": 2.0, "comment": null }
  ],
  "tasks": [
    { "publicId": "...", "text": "Revisão de design", "projectName": "Proj. Alpha" }
  ],
  "member": { "publicId": "...", "name": "Roger Lewis", "isSelf": true }
}
```

## Payload `GET /timesheets/team`

```json
{
  "rows": [
    { "user": { "publicId":"...", "name":"Don Draper", "initials":"DD", "color":"#..." },
      "weekStart": "2025-04-14", "status": "SUBMITTED", "totalHours": 24, "weekPublicId": "..." },
    { "user": {...}, "weekStart": "2025-04-14", "status": "APPROVED", "totalHours": 0, "weekPublicId": null }
  ],
  "counts": { "all": 6, "SUBMITTED": 2, "APPROVED": 1, "REJECTED": 1, "PARTIAL": 1, "DRAFT": 1 }
}
```

## Payload `GET /timesheets/pending-approvals`

```json
{
  "rows": [
    { "weekPublicId": "...",
      "user": { "publicId":"...", "name":"Alpha-Sousa", "initials":"AS", "color":"#..." },
      "project": { "publicId":"...", "name":"Alpha" },
      "weekStart": "2025-04-14", "status": "SUBMITTED", "totalHours": 16.5 }
  ]
}
```

## Payload `GET /timesheets/calendar?month=YYYY-MM[&userId=...]`

Vista mensal — 42 dias (6 semanas, alinhado com FullCalendar dayGridMonth).
**Modo agregado** (sem `userId`) devolve contagens X/Y; **individual**
(com `userId`) devolve booleano por dia.

```json
{
  "project": {
    "publicId": "...",
    "startDate": "2025-04-01",
    "endDate":   "2025-12-31"
  },
  "month":        "2025-04",
  "visibleStart": "2025-03-31",
  "mode":         "aggregate",
  "members":      [{ "publicId":"...", "name":"...", "initials":"..." }],
  "days": [
    {
      "date":         "2025-03-31",
      "inMonth":      false,
      "isWeekend":    false,
      "isFuture":     false,
      "outOfRange":   true,
      "filledCount":  0,
      "totalCount":   5,
      "missingUsers": [{ "publicId":"...", "name":"...", "initials":"..." }]
    },
    {
      "date":         "2025-04-01",
      "inMonth":      true,
      "isWeekend":    false,
      "isFuture":     false,
      "outOfRange":   false,
      "filledCount":  5,
      "totalCount":   5,
      "missingUsers": []
    }
    /* ... 42 entries ... */
  ],
  "weeks": [
    {
      "weekStart":     "2025-03-31",
      "weekNumber":    14,
      "status":        "complete",
      "containsToday": false
    }
    /* ... 6 entries ... */
  ],
  "totalHours": 1280.5
}
```

Status possíveis para `weeks[i].status`:
- `complete` — todos os dias operativos (não-fim-de-semana, não-out-of-range,
  não-futuros) estão `complete` (agregado) ou `filled` (individual).
- `partial` — mistura entre completos e pendentes.
- `pending` — todos os dias operativos pendentes.
- `future` — toda a semana é futura.
- `out_of_range` — toda a semana fora do projecto.
- `mixed` — semana todo fora de scope (combinação fim-de-semana / out-of-range
  / futuro sem dias operativos).

Em modo individual, `days[i]` substitui `filledCount`/`totalCount`/`missingUsers`
por **`filled: boolean`**.

`totalHours` é a soma agregada das entries do projecto inteiro (sem restrição
temporal): toda a equipa em modo `aggregate`, ou só o user em `individual`.
Renderizado no card de resumo da vista mensal.

# Relacionados: @docs/claude/tools/timesheet/overview.md @docs/claude/db.md
