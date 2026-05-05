# Claude: carregar para tarefas do modelo de dados Calendar

## Enums Prisma

```prisma
enum HolidayScope {
  GLOBAL     // visível em todos os projectos (sem ProjectHoliday)
  REGIONAL   // visível em todos os projectos (sem ProjectHoliday)
  PROJECT    // específico — apenas via ProjectHoliday
  CUSTOM     // calendário pessoal do utilizador (default existente)
}

enum CalendarEventTypeKey {
  MANUAL
  MEETING
  REMINDER
}

enum CalendarConfigScope { GLOBAL USER PROJECT }
```

## Holiday — campo `scope`

A tabela `Holiday` ganhou um único campo novo `scope HolidayScope @default(CUSTOM)`.
Compatibilidade: holidays existentes ficam com `CUSTOM`. PLATFORM_ADMIN pode
classificá-los como `GLOBAL` / `REGIONAL` no futuro (sem UI imediata).

## Modelo `CalendarEventType`

```prisma
model CalendarEventType {
  id        Int                    @id @default(autoincrement())
  publicId  String                 @unique @default(uuid(7))
  projectId Int
  systemKey CalendarEventTypeKey?  // null para custom
  isSystem  Boolean                @default(false)
  name      String?                // null + isSystem ⇒ usar i18n via systemKey
  color     String                 @default("#845adf")
  position  Int                    @default(0)
  status    Status                 @default(ACTIVE)
  // relations: project, events: CalendarEvent[]
  @@unique([projectId, systemKey])
  @@index([projectId, position])
}
```

### Tipos sistema (lazy-init no primeiro `GET /calendar`)

| systemKey | i18n key (calendar ns) | UI default | Cor default |
|-----------|------------------------|-----------|------------|
| `MANUAL` | `event_type.system.manual` | "Evento Manual" | `#845adf` |
| `MEETING` | `event_type.system.meeting` | "Reunião" | `#23b7e5` |
| `REMINDER` | `event_type.system.reminder` | "Lembrete" | `#f5b849` |

### Regras de mutabilidade

| Campo | isSystem=true | isSystem=false |
|-------|:-------------:|:--------------:|
| `name` | ✓ (vazio = volta ao i18n) | ✓ (obrigatório) |
| `color` | ✓ | ✓ |
| `position` | ✓ (via reorder) | ✓ |
| `systemKey` | ✗ imutável | ✗ sempre null |
| `isSystem` | ✗ | ✗ |
| Eliminar | ✗ (409 `CALENDAR_EVENT_TYPE_IS_SYSTEM`) | ✓ se não tiver eventos (409 `CALENDAR_EVENT_TYPE_HAS_EVENTS`) |

## Modelo `CalendarEvent`

```prisma
model CalendarEvent {
  id          Int                @id @default(autoincrement())
  publicId    String             @unique @default(uuid(7))
  projectId   Int
  typeId      Int
  type        CalendarEventType  @relation(fields: [typeId], references: [id], onDelete: Restrict)
  title       String
  description String?
  startAt     DateTime
  endAt       DateTime
  allDay      Boolean            @default(false)
  color       String?            // override (null = cor do tipo)
  createdById Int?
  status      Status             @default(ACTIVE)
  // relations: project, createdBy
  @@index([projectId, startAt])
}
```

> `onDelete: Restrict` no `typeId` — não é possível eliminar um `CalendarEventType`
> que tenha eventos associados (UI mostra mensagem `event_type.actions.delete_blocked`).

## Modelo `CalendarConfig`

```prisma
model CalendarConfig {
  id        Int                  @id @default(autoincrement())
  publicId  String               @unique @default(uuid(7))
  scope     CalendarConfigScope
  userId    Int?
  projectId Int?
  config    Json                 // CalendarConfigData
  @@unique([scope, userId, projectId])
}
```

### `CalendarConfigData` (JSON)

```typescript
interface CalendarConfigData {
  sources?: {
    holidays?:   Record<string, boolean>;  // holidayPublicId → visible (default true)
    project?:    boolean;                  // default true
    tasks?:      boolean;                  // default true
    milestones?: boolean;                  // default true
    eventTypes?: Record<string, boolean>;  // typePublicId → visible (default true)
  };
  view?:     'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  firstDay?: 0 | 1;  // 0=Dom, 1=Seg
}
```

Defaults: `holidays: {}` + `eventTypes: {}` (= todos visíveis), restantes `true`,
view `dayGridMonth`, firstDay `1` (segunda).

Resolução: `HARDCODED_DEFAULTS ← deepMerge(GLOBAL) ← deepMerge(USER) ← deepMerge(PROJECT)`
(idêntico ao `BoardConfig`). O `deepMerge` faz merge especial dos dois Records
(`holidays`, `eventTypes`) para que toggles individuais não sobrescrevam os
restantes.

> `holidays` / `eventTypes` — qualquer publicId não presente assume `true`. O
> frontend filtra `visibility[publicId] !== false`.

## Endpoints (calendário do projecto)

| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/projects/:id/calendar` | `CALENDAR_VIEW` |
| GET | `/api/projects/:id/calendar/members` | `CALENDAR_VIEW` |
| GET | `/api/projects/:id/calendar/event-types` | `CALENDAR_VIEW` |
| POST | `/api/projects/:id/calendar/event-types` | `CALENDAR_EVENT_TYPE_MANAGE` |
| PATCH | `/api/projects/:id/calendar/event-types/reorder` | `CALENDAR_EVENT_TYPE_MANAGE` |
| PATCH | `/api/projects/:id/calendar/event-types/:typeId` | `CALENDAR_EVENT_TYPE_MANAGE` |
| DELETE | `/api/projects/:id/calendar/event-types/:typeId` | `CALENDAR_EVENT_TYPE_MANAGE` |
| POST | `/api/projects/:id/calendar/events` | `CALENDAR_EVENT_CREATE` |
| PATCH | `/api/projects/:id/calendar/events/:eventId` | `CALENDAR_EVENT_EDIT` |
| DELETE | `/api/projects/:id/calendar/events/:eventId` | `CALENDAR_EVENT_DELETE` |

## Endpoints (config 3 níveis — sem feature flag)

| Método | Rota | Permissão |
|--------|------|-----------|
| GET | `/api/calendar-config/resolve` | JWT |
| GET | `/api/calendar-config/resolve/:projectId` | `PROJECT_VIEW` |
| GET/PUT | `/api/calendar-config/global` | PLATFORM_ADMIN |
| GET/PUT | `/api/calendar-config/user` | JWT |
| GET | `/api/calendar-config/project/:projectId` | `PROJECT_VIEW` |
| PUT | `/api/calendar-config/project/:projectId` | `CALENDAR_CONFIG` |

## Payload `GET /calendar`

```json
{
  "events":     [{ "publicId", "title", "description", "startAt", "endAt", "allDay", "color", "typePublicId", "createdBy" }],
  "eventTypes": [{ "publicId", "systemKey", "isSystem", "name", "color", "position", "labelKey" }],
  "tasks":      [{ "publicId", "text", "type", "startDate", "endDate", "isMilestone" }],
  "holidays":   [{ "publicId", "name", "scope", "isOwned", "isProjectLinked", "dates": [{ "publicId", "name", "date" }] }],
  "project":    { "publicId", "name", "startDate", "endDate" }
}
```

`labelKey` em `eventTypes` é `event_type.system.<key>` para tipos sistema, `null`
para custom (frontend usa `name` directamente).

`holidays` é uma **lista única dedupada por `publicId`** que une:
1. Holidays linkados ao projecto via `ProjectHoliday` (qualquer `ownerId`/`scope`).
2. Holidays owned pelo utilizador autenticado (`Holiday.ownerId = user.id`,
   tipicamente `scope = CUSTOM`).

Cada item carrega `isOwned` (user é owner) e `isProjectLinked` (linkado via
`ProjectHoliday`). Holidays platform-level (`GLOBAL`/`REGIONAL`) não-linkados
e não-owned **não** aparecem (mudança Abril 2026 — antes apareciam
automaticamente em todos os projectos).

# Relacionados: @docs/claude/tools/calendar/overview.md @docs/claude/db.md
