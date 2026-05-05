# Claude: carregar para tarefas de base de dados, Prisma ou migrações

## Convenções de modelo

- Todos os modelos têm: `id` (interno), `publicId` (externo), `createdAt`, `updatedAt`, `status`.
- `publicId String @unique @default(uuid(7))` — UUID v7, gerado automaticamente pelo Prisma.
- API nunca expõe `id` numérico — apenas `publicId` (excepção: GanttTask/GanttLink por compatibilidade DHTMLX).
- DTOs aceitam UUID strings para relações (`profileId`, `userId`, etc.) — service resolve para id interno.
- **Soft delete obrigatório**: `remove()` define `status: INACTIVE`. Nunca `prisma.model.delete()`.
- `Status.ARCHIVED` = estado final/irreversível; `INACTIVE` = desactivação reversível.
- Relações opcionais suportam `null` explícito no update para limpar a relação.
- Padrão `'key' in dto` para distinguir "omitido" de `null` explícito em updates.
- `createdById` em `User` preparado para auditoria futura.

## Modelos core

```prisma
enum Status { ACTIVE INACTIVE ARCHIVED }

model User {
  id             Int        @id @default(autoincrement())
  publicId       String     @unique @default(uuid(7))
  email          String     @unique
  name           String
  passwordHash   String
  status         Status     @default(ACTIVE)
  selfRegistered Boolean    @default(false)
  profileId      Int
  userTypeId     Int?
  levelId        Int?
  createdById    Int?
}

model Team {
  id       Int          @id @default(autoincrement())
  publicId String       @unique @default(uuid(7))
  name     String
  status   Status       @default(ACTIVE)
  members  TeamMember[]
}

model TeamMember {
  teamId Int; userId Int
  isLead Boolean @default(false)
  role   String?
  @@unique([teamId, userId])
}

model Project {
  id        Int           @id @default(autoincrement())
  publicId  String        @unique @default(uuid(7))
  ownerId   Int?          // onDelete: SetNull
  managerId Int?          // onDelete: SetNull
  teams     ProjectTeam[]
}

model ProjectTeam {
  projectId Int; teamId Int
  @@unique([projectId, teamId])
}
```

## Perfis, Tipos e Níveis (seed inicial)

**Profiles:** `PLATFORM_ADMIN` | `PROJECT_MANAGER` | `STAKEHOLDER`

**UserTypes:** `STAKEHOLDER` | `TECH_LEAD` | `QUALITY_ASSURANCE` | `DEVELOPER`

**UserLevels:** `JUNIOR(1)` | `MID(2)` | `SENIOR(3)` | `LEAD(4)` | `PRINCIPAL(5)`
> `UserLevel` existe no schema mas não está exposto na UI.

## selfRegistered

- `false` (default) = criado por admin/convidante.
- `true` = auto-registo via `/auth/register`.
- Retrocompatibilidade: utilizadores antes da migração ficam com `selfRegistered = true`.
- Ver regras completas em @docs/claude/auth.md.

## Migrações

- **Dev:** `npx prisma migrate dev` (cria nova migração com nome descritivo).
- **Prod:** `npx prisma migrate deploy` (aplica pendentes — **nunca** `migrate dev` em prod).
- Migrações devem ser seguras para dados existentes (não destruir colunas com dados).
- Após alterar `schema.prisma`: `npx prisma generate` para regenerar o client.

## Seed (`prisma/seed.js`)

- Usa `upsert` — idempotente, nunca destrutivo.
- Cria: perfis (3), tipos (4), níveis (5), utilizador admin (via `APP_ADMIN_*`).
- Feature flags: `gantt_view`, `multi_holiday`.
- Limites plano Básico: `max_projects`, `max_teams`, `max_api_calls`, `max_holidays: 3`.
- Translations via `seedTranslationsExtra()` — 4 idiomas: `pt-PT`, `pt-BR`, `en`, `es`.
- **Sem `upsertGlobalCalendar`** — não existe calendário global.

## Modelos de feriados e planeamento

Ver @docs/claude/tools/gantt/data-model.md para:
- `GanttTask`, `GanttLink`, `GanttResource`, `GanttAssignment`, `GanttBaseline`
- `Holiday`, `HolidayDate`, `ProjectHoliday`
- `GanttConfig`, `ProjectMemberHours`

## Modelos de Timesheet

Ver @docs/claude/tools/timesheet/data-model.md para:
- `TimesheetWeek`, `TimesheetDay`, `TimesheetEntry`, `TimesheetApprovalLog`
- Enums: `TimesheetWeekStatus`, `TimesheetDayStatus`, `TimesheetLogScope`,
  `TimesheetLogAction`
- Adições a `NotificationType`: `TIMESHEET_SUBMITTED`, `TIMESHEET_APPROVED`,
  `TIMESHEET_PARTIALLY_APPROVED`, `TIMESHEET_REJECTED`

## Anti-padrões

- ❌ `prisma.model.delete()` (usar soft delete: `status: INACTIVE`)
- ❌ `prisma migrate dev` em produção
- ❌ Expor `id` numérico em respostas da API
- ❌ Usar `delete` em migração sem garantir que coluna está vazia

# Relacionados: @docs/claude/backend.md @docs/claude/auth.md @docs/claude/tools/gantt/data-model.md @docs/claude/tools/timesheet/data-model.md
