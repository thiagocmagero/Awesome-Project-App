# Claude: carregar para tarefas do modelo de dados Gantt

## Modelos Prisma — Gantt core

```prisma
model Task {
  id          Int       @id @default(autoincrement())
  publicId    String    @unique @default(uuid(7))
  projectId   Int
  parentId    Int?      // auto-referência para hierarquia
  text        String
  startDate   DateTime
  duration    Int       // dias úteis (skip Sáb/Dom + nonWorkingDays); 0 para milestone
  progress    Float     @default(0)  // 0.0–1.0
  type        String?   // "task" | "milestone" | "project"
  ownerId     Int?      // FK → User ou TaskResource
  ownerType   String?   // "user" | "resource"
  boardColumnId Int?    // FK → BoardColumn (estado funcional da tarefa — unificação Abril 2026)
  boardPosition Int?    // ordem dentro da coluna (re-sequenciado em cada moveCard)
  // + createdAt, updatedAt, status (Status enum, não o legado funcional)
  // NOTA: `legacyStatus` ainda existe no DB até `drop_gantt_task_legacy_status`.
}

model TaskLink {
  id       Int    @id @default(autoincrement())
  publicId String @unique @default(uuid(7))
  sourceId Int    // FK → Task
  targetId Int    // FK → Task
  type     String // "0"=FS, "1"=SS, "2"=FF, "3"=SF
}

model TaskResource {
  id          Int     @id @default(autoincrement())
  publicId    String  @unique @default(uuid(7))
  projectId   Int
  name        String
  hoursPerDay Float   @default(8)
  userTypeId  Int?    // FK → UserType (obrigatório ao criar)
  // sem userId = recurso externo (contractor)
}

model TaskAssignment {
  taskId     Int  // FK → Task
  resourceId Int  // FK → TaskResource
}

model TaskBaseline {
  taskId    Int; startDate DateTime; duration Int  // snapshot do plano original
}
```

> Task e TaskLink expõem **ambos** `id` e `publicId` (excepção à regra geral) por compatibilidade DHTMLX.

## Cálculo de `endDate` (semântica obrigatória)

`Task.duration` é contado em **dias úteis** — alinhado com
`gantt.config.work_time = true` do DHTMLX no frontend. Sáb, Dom e cada dia em
`nonWorkingDays` (feriados linkados ao projecto) **não contam**. Esta unidade
é canónica em ambos os lados — confundi-la com dias corridos produz drift
visível (tarefas que mudam de duração após save).

**Helper canónico**:
[`backend/src/planning/business-days.util.ts`](backend/src/planning/business-days.util.ts)
exporta `addBusinessDaysInclusive(start: Date, durationBusinessDays: number,
nonWorkingSet: Set<string>): Date`. É a **única forma aprovada** de calcular
`endDate` no backend. Já é usado em:

- [`PlanningService.createTask`](backend/src/planning/planning.service.ts) — calcula `endDate` antes do `prisma.create`.
- [`PlanningService.updateTask`](backend/src/planning/planning.service.ts) — recalcula sempre que `start_date` ou `duration` mudam.
- [`PlanningService.recalculateEndDates`](backend/src/planning/planning.service.ts) — bulk recompute ao alternar `endDateMode` (chamado pelo botão da config do projecto).

**`nonWorkingSet` vem de `HolidaysService.getNonWorkingDaysForProject(projectId)`**
(formato `YYYY-MM-DD` UTC). Mesmo conjunto que alimenta o `gantt.setWorkTime`
no frontend — garantia de que backend e DHTMLX usam idêntica definição de "dia útil".

### Modos `endDateMode`: `inclusive` vs `exclusive`

`UpdateTaskDto.endDateMode` (`'inclusive'` | `'exclusive'`) é enviado pelo
frontend conforme a config do projecto. Determina onde fica armazenado o
`endDate`:

| Modo | Fórmula | Exemplo (start=Seg, duration=5) |
|---|---|---|
| `inclusive` | `addBusinessDaysInclusive(start, duration, set)` | `endDate = Sex` (último dia útil real) |
| `exclusive` | resultado acima `+ 1 dia calendário` | `endDate = Sáb` (convenção DHTMLX) |

Em ambos os modos, DHTMLX renderiza 5 dias úteis. A diferença é só onde está
guardada a fronteira em BD. **`inclusive` é o default e mais intuitivo**
(o user vê o último dia real da tarefa).

`recalculateEndDates` é o caminho para alternar o modo num projecto inteiro
sem perder consistência — recalcula **todos** os `endDate` com base no
`duration` armazenado. Frontend tem botão dedicado na config.

### Edge cases tratados pelo helper

- `duration <= 0` → `endDate === start` (milestone-safe).
- `start` cai num dia não-útil (sábado, domingo ou feriado) → cursor avança
  para o próximo dia útil **antes** de iniciar contagem (defensivo; alinha
  com snap do DHTMLX UI). Tarefa com `start=Sáb, duration=5` produz
  `endDate = Sex` da semana seguinte.

### Frontend: nada a calcular

O frontend não recalcula `endDate` — recebe o valor já correcto do backend e
apenas:

1. Em modo `inclusive`, soma 1 dia calendário ao ingest
   ([ganttHelpers.ts:262-274](frontend/src/features/planning/ganttHelpers.ts:262))
   para converter para o "exclusive end" canónico do DHTMLX.
2. Subtrai 1 dia calendário no template da coluna `end_date`
   ([ganttHelpers.ts:144-154](frontend/src/features/planning/ganttHelpers.ts:144))
   para mostrar ao utilizador o último dia visível.

DHTMLX trata sempre internamente em formato exclusivo; a conversão
inclusive↔exclusive vive só nos boundaries de IO.

## GanttConfig (configuração de colunas — 3 níveis)

```prisma
enum GanttConfigScope { GLOBAL USER PROJECT }

model GanttConfig {
  id        Int              @id @default(autoincrement())
  scope     GanttConfigScope
  userId    Int?             // null para GLOBAL
  projectId Int?             // null para GLOBAL e USER
  config    Json             // { columns: { [colName]: boolean } }
}
```

Resolução: `PROJECT` > `USER` > `GLOBAL`. Hook: `useGanttConfig(projectPublicId?)` em `frontend/src/hooks/useGanttConfig.ts`.

## ProjectMemberHours

```prisma
model ProjectMemberHours {
  projectId   Int
  userId      Int
  hoursPerDay Float @default(8)
  @@unique([projectId, userId])
}
```

Endpoints: `GET/PUT /api/projects/:id/planning/member-hours[/:userId]`.
`hoursPerDay` dos membros vem daqui; dos recursos externos vem de `TaskResource.hoursPerDay`.

## Modelos Holiday e integração Gantt

```prisma
model Holiday {
  id       Int            @id @default(autoincrement())
  publicId String         @unique @default(uuid(7))
  name     String
  ownerId  Int?           // onDelete: SetNull
  status   Status         @default(ACTIVE)
  dates    HolidayDate[]
  projects ProjectHoliday[]
}

model HolidayDate {
  holidayId Int
  name      String
  date      DateTime      // UTC midnight
  status    Status
  @@unique([holidayId, date])
}

model ProjectHoliday {
  projectId Int; holidayId Int
  @@unique([projectId, holidayId])
}
```

### Regras Holiday

- `HolidayDate.date` normalizado para UTC midnight: `new Date(Date.UTC(yyyy, mm-1, dd))`.
- `getNonWorkingDaysForProject(projectId)` → `string[]` em `"YYYY-MM-DD"`, deduplicado.
- `GET /projects/:id/planning` devolve `{ data, links, resources, nonWorkingDays }`.
- Eliminar `Holiday` bloqueado se tiver projectos associados (409 Conflict).
- Ao criar lista: `usageService.increment(userId, 'max_holidays')`.
- Ao eliminar: `usageService.decrement(ownerId, 'max_holidays')`.
- `HolCtx { userId, isAdmin }` passado a todos os métodos do service.
- `assertMutate(holiday, ctx)` lança `ForbiddenException` se `!ctx.isAdmin && holiday.ownerId !== ctx.userId`.

## `durationUnit` — granularidade per-task (DAY vs HOUR)

Desde Maio 2026, `Task` ganhou o enum `durationUnit`:

```prisma
enum TaskDurationUnit { DAY  HOUR }
model Task {
  duration     Float                 // dias úteis (DAY) ou horas úteis (HOUR)
  durationUnit TaskDurationUnit @default(DAY)
}
```

| Aspecto | DAY (retrocompat) | HOUR |
|---|---|---|
| `duration` | dias úteis (Float) | horas úteis (Float, aceita 0.25 = 15min) |
| `startDate` | UTC midnight | UTC com hora real |
| `endDate` calculado por | `addBusinessDaysInclusive` | `addBusinessHoursInclusive` |
| `endDateMode` (inclusive/exclusive) | aplicado | **ignorado** — endDate é canónico |
| Wire Gantt | `'14-04-2026 00:00'` | `'14-04-2026 14:00'` |
| Tz semantics | data pura (sem tz) | UTC puro — "14:00" = 14h UTC (sem conversão tz) |

Tasks DAY e HOUR co-existem no mesmo projecto. O backend ramifica em
`createTask`/`updateTask`/`recalculateEndDates` conforme `dto.durationUnit`
(ou `existing.durationUnit` no update). Tasks DAY criadas antes desta
feature continuam imutáveis.

### `Project.workHours`

```prisma
model Project {
  /// JSON { start: 0..23, end: 1..24 }, end > start. null ⇒ default 09:00–18:00.
  workHours Json?
}
```

Janela útil aplicada **apenas** a tasks HOUR. Validado por
`IsValidWorkHours` (`backend/src/projects/dto/work-hours.validator.ts`).
A janela é aplicada em **UTC puro** — sem conversão de tz.

### Wire format — UTC puro (HOUR, desde Mai 2026)

A string wire `"DD-MM-YYYY HH:mm"` que circula entre frontend, DHTMLX e
backend **não contém** timezone offset. A interpretação semântica é:

- **Tasks DAY**: wall-clock UTC midnight (DATA PURA — invariante).
- **Tasks HOUR**: UTC puro — "14:00" = 14h00 UTC. `project.timezone` foi
  removido em Mai 2026. O número-da-hora seleccionado pelo utilizador é
  enviado e guardado em UTC sem conversão.

Backend converte a string para `Date` via `ganttToDate(s)` (UTC puro).
Frontend usa `formatGanttDate(d)` / `ganttToDate(s)` / `dateToGanttStr(d)`
— UTC puro em ambos os lados.

Round-trip estável: a string que sai do backend é igual à que entrou.

### `addBusinessHoursInclusive` — algoritmo (UTC-only desde Mai 2026)

[`backend/src/planning/business-hours.util.ts`](backend/src/planning/business-hours.util.ts):

```typescript
addBusinessHoursInclusive(
  start: Date,
  durationHours: number,    // 0.25 = 15min
  workHours: { start, end },
  nonWorkingSet: Set<'YYYY-MM-DD'>,
): Date
```

Pseudocódigo:
```
cursor = nextWorkingMoment(start, workHours, nonWorkingSet)
remaining = durationHours * 3_600_000 ms
while remaining > 0:
  windowEnd = startOfDay(cursor) + workHours.end * 3_600_000
  available = windowEnd - cursor
  if available >= remaining: return cursor + remaining
  remaining -= available
  cursor = nextWorkingMoment(windowEnd, ...)
```

`nextWorkingMoment` salta sábado/domingo, holidays e horas fora da janela.

Exemplos (workHours 9–18, sem holidays):
| start | duration | endDate |
|---|---|---|
| Seg 14-04 14:00 | 2h | Seg 14-04 16:00 |
| Seg 14-04 16:00 | 4h | Ter 15-04 11:00 (2h Seg + 2h Ter) |
| Sex 17-04 17:00 | 4h | Seg 20-04 12:00 (1h Sex + 3h Seg, salta Sáb/Dom) |
| Qui 24-12 17:00 (com 25-12 holiday) | 4h | Sáb 26-12 12:00 |

### Frontend — `parseGanttData` ramificado

A conversão `inclusive` → `+1 day calendar` aplicada em
[ganttHelpers.ts:262](frontend/src/features/planning/ganttHelpers.ts) só
afecta tasks DAY. Tasks com `durationUnit === 'HOUR'` saltam a conversão
(o `end_date` já é a hora exacta canónica).

### Defesas contra duration drift (drag em modo cruzado)

O widget DHTMLX tem `duration_unit` GLOBAL — quando alternas a vista para
"hour", **todas** as tasks passam a ser interpretadas em horas pelo
`gantt.calculateDuration`, mesmo as que são DAY no DB. Sem cuidado, um
drag em modo HOUR de uma task DAY enviaria `duration: 8` (horas) ao
backend, que interpretaria como dias úteis → 8 dias úteis no DB. Próximo
drag → 8 dias × 8h = 64 → 64 dias = 3 meses. Próximo → 64 × 8 = 512 dias
= ano 2030. Rapidamente atinge décadas.

**3 camadas de defesa:**

1. **Frontend — `onAfterTaskDrag`** ([ganttHelpers.ts](frontend/src/features/planning/ganttHelpers.ts)):
   converte a `task.duration` para a unidade real da task (`task.durationUnit`)
   antes de enviar. Task DAY arrastada em hour → divide por horas/dia
   (workHours window). Task HOUR arrastada em day → multiplica por
   horas/dia. Envia sempre `durationUnit` explícito no payload.

2. **Backend — `assertTaskDurationWithinLimit`** ([limits.util.ts](backend/src/planning/limits.util.ts)):
   cap **configurável** em dias úteis, lido de `PlatformLimits.maxTaskBusinessDays`
   (singleton, default 1300 ≈ 5 anos). Tasks HOUR convertem-se via
   `dailyHours = workHours.end - workHours.start`. Acima do cap → 400
   `TASK_DURATION_EXCEEDS_LIMIT`. Configurável apenas por PLATFORM_ADMIN
   via `PATCH /platform-config/limits`.

3. **Backend — `assertEndDateInRange`**:
   após calcular `endDate`, verifica `[now-5y, now+10y]`. Última linha
   de defesa antes da gravação.

**Frontend display safety nets** ([parseGanttData](frontend/src/features/planning/ganttHelpers.ts)):
- Tasks com start/end fora de `[now-5y, now+10y]` são ignoradas no cálculo
  do range do viewport (mas continuam a renderizar via smart_rendering).
- `gantt.config.smart_rendering = true` + `static_background = true`
  garantem render só do viewport visível — task de 10 anos é cheap.
- **Sem cap de span no viewport**: o smart_rendering assume essa
  responsabilidade. Caps artificiais bloqueavam navegação para o fim de
  tasks longas legítimas (ex.: cap de 3 anos cortava task de 3 anos +
  1 dia).

## Anti-padrões

- ❌ Calcular `endDate = startDate + duration * 86400000` no backend — ignora
  Sáb/Dom/feriados e provoca drift visível (tarefas mudam de duração após save).
  Usar sempre `addBusinessDaysInclusive`.
- ❌ Tratar `duration` como dias corridos em endpoints novos — convenção é
  dias úteis, alinhada com `gantt.config.work_time` do DHTMLX.
- ❌ Calcular `endDate` no frontend via aritmética de `start_date + duration` —
  vive no backend (ver `business-days.util.ts`); frontend só faz a conversão
  inclusive↔exclusive de 1 dia calendário no ingest/display.
- ❌ Alternar `endDateMode` no projecto sem chamar `recalculateEndDates` — fica
  com tarefas em modos mistos e a UI mostra durações incoerentes.
- ❌ Calcular `endDate` para uma task HOUR via `addBusinessDaysInclusive` —
  ignora a janela útil + horas. Usar sempre `addBusinessHoursInclusive` quando
  `durationUnit === 'HOUR'`.
- ❌ Aplicar `endDateMode` (inclusive/exclusive) a tasks HOUR — `endDate` é a
  hora exacta canónica; o modo não se aplica.
- ❌ Aplicar `+1 day` calendar em `parseGanttData` para tasks HOUR — colapsa
  visualmente. Branch por `task.durationUnit === 'HOUR'`.
- ❌ Recompute `task.duration` via `gantt.calculateDuration` para tasks
  `durationUnit === HOUR` em `setGanttGranularity` (toggle Day↔Hour). O
  duration canónico vem do backend; recompute introduz drift sob inconsistência
  tz. Já implementado: skip explícito em [ganttHelpers.ts](frontend/src/features/planning/ganttHelpers.ts).
- ❌ Ler `gantt.getTask(id).duration` como verdade num save de drag
  `mode === 'move'`. O widget DHTMLX recompute duration consoante a sua
  `duration_unit` global. Usar `tasksRef.current.find(...).duration` (estado
  React do backend) para preservar o duration entre saves.
- ❌ Hardcodar `* 9` ou `/ 9` em conversões widget↔task duration. Usar
  `workHours.end - workHours.start` real do projecto via `workHoursRef`.
- ❌ Passar `tz` a `addBusinessHoursInclusive` — a função é UTC-only desde Mai 2026.
  Business hours aplicam-se em UTC; não existe mais interpretação por fuso do projecto.
- ❌ Usar `parseWallClockInTimezone`/`formatWallClockInTimezone` — removidos em Mai 2026.
  Usar `ganttToDate`/`formatGanttDate` (UTC puro) ou `new Date(isoString)`.
- ❌ Usar `ganttToDateInTz`/`formatGanttDateInTz` — removidos em Mai 2026.
- ❌ Passar `projectTz` a `parseGanttData` — parâmetro removido em Mai 2026.

# Relacionados: @docs/claude/tools/gantt/overview.md @docs/claude/db.md
