# Claude: carregar para qualquer tarefa que envolva timezone

## O que é

Suporte a IANA timezones em **um nível** (Mai 2026 — project timezone removido):

- **User timezone** — usado em todas as páginas para exibição visual de momentos
  reais (notificações, sessões, CalendarEvents, comentários, audit logs).

> **Não existe `project.timezone`** — foi removido em Mai 2026. Tasks HOUR usam
> **UTC puro**: "9:00" = 9:00 UTC. `Project.workHours` mantém-se para definir a
> janela útil (ex. 9–18), mas essa janela é aplicada em UTC puro.

## Regra primordial — Datas Puras vs Momentos Reais

Esta é a decisão mais importante do sistema. **Antes de adicionar qualquer
campo de data/hora**, classifica-o como uma das duas categorias:

### DATA PURA — label de calendário

Representa um **dia X** sem hora. "Dia 14 de Abril" é dia 14 em qualquer canto
do mundo — não tem timezone para converter.

**Exemplos da app:**

| Campo | Significado |
|---|---|
| `TimesheetDay.workDate` | "Lancei 8h **no dia 14 de Abril**" |
| `TimesheetWeek.weekStart` | "Semana que começa **segunda 14 de Abril**" |
| `TimesheetEntry.workDate`, `weekStart` | denormalizados |
| `Project.startDate`, `Project.endDate` | "Projecto vai de **A até B**" |
| `GanttTask.startDate`, `GanttTask.endDate` (variant `durationUnit=DAY`) | "Tarefa arranca dia **10 de Maio**" |
| `GanttTask.startDate`, `endDate` (variant `durationUnit=HOUR`) | "Reunião às **14h00 UTC**" — armazenada com hora exacta UTC; sem conversão de tz. Ver @docs/claude/tools/gantt/data-model.md. |
| `HolidayDate.date` | "Natal é dia **25 de Dezembro**" |
| `TimesheetApprovalLog.scopeDate` | workDate \| weekStart \| 1º do mês |

**Regras:**
- Storage: `timestamp(3)` sem tz, UTC midnight por convenção.
- Display: usar `formatDate(d, dateFormat)` ou `formatDateShort` ou
  `formatDateTime` — **tz-agnostic**.
- Lógica: `parseISODate`, `formatISODate`, `weekStartOf` em
  `frontend/src/features/timesheet/dateUtils.ts` continuam UTC. Não tocar.

### MOMENTO REAL — instante exacto no tempo

Representa um **instante único** no universo. "14h00 em Lisboa" = "10h00 em
São Paulo" — mesmo instante, exibições diferentes.

**Exemplos da app:**

| Campo | Significado |
|---|---|
| `Notification.createdAt` | "Notificação criada **agora**" |
| `Session.createdAt`, `lastUsedAt`, `expiresAt`, `revokedAt` | atividade da sessão |
| `Comment.createdAt`, `editedAt` | "Comentário publicado **às 14h22**" |
| `CalendarEvent.startAt`, `endAt` | "Reunião das **14h às 15h**" |
| `TimesheetApprovalLog.createdAt` | "Gestor aprovou **às 15h22**" |
| `User.createdAt`, `updatedAt`, `Project.createdAt`, `updatedAt` | audit |

**Regras:**
- Storage: `@db.Timestamptz(6)` — Postgres normaliza para UTC, preserva o instante.
- Display: usar `formatMoment(d, tz)` (tz-aware) ou `relativeTimeInTimezone(d, tz, t)`.
- `tz` vem de `useTimezone()` — sempre `user.timezone` (ou browser fallback).

### Tabela exaustiva da app actual

| Tipo | Storage | Helper de format | Onde cai a tz |
|---|---|---|---|
| `workDate`, `weekStart`, `scopeDate` | `timestamp(3)` | `formatDate` / `formatDateShort` | n/a (tz-agnostic) |
| `Project.startDate`, `endDate` | `timestamp(3)` | `formatDate` | n/a |
| `GanttTask.startDate`, `endDate` (`durationUnit=DAY`) | `timestamp(3)` UTC midnight | `formatDate` | n/a |
| `GanttTask.startDate`, `endDate` (`durationUnit=HOUR`) | `timestamp(3)` UTC com hora real | wire `formatGanttDate`/`ganttToDate` (UTC puro); display via templates DHTMLX | n/a (UTC puro) |
| `HolidayDate.date` | `timestamp(3)` | `formatDate` | n/a |
| `Notification.createdAt` | `timestamptz(6)` | `relativeTimeInTimezone` / `formatMoment` | user |
| `Session.*At` | `timestamptz(6)` | `formatMoment` | user |
| `Comment.createdAt`, `editedAt` | `timestamptz(6)` | `relativeTime` (custom + fallback `formatMoment`) | user |
| `CalendarEvent.startAt`, `endAt` | `timestamptz(6)` | `formatMoment` | user |
| `TimesheetApprovalLog.createdAt` | `timestamptz(6)` | `formatMoment` | user |
| `User.createdAt`, `updatedAt`, `Project.createdAt`, `updatedAt` | `timestamptz(6)` | tipicamente não exibido | (audit) |

## Como decidir para um campo NOVO

Pergunta-te:

> **A informação tem hora exacta no domínio do problema?**

- **Sim** (reuniões, notificações, "quando foi criado"): MOMENTO REAL →
  `@db.Timestamptz(6)` + `formatMoment(d, tz)`.
- **Não** (datas de planeamento, deadlines, dias de feriado, semana ISO):
  DATA PURA → `timestamp` (default Prisma) + `formatDate(d, dateFormat)`.

### Casos cinzentos

- *"Deadline de tarefa"* sem hora: DATA PURA.
- *"Deadline de tarefa às 18h"*: MOMENTO REAL (precisa de tz).
- *"Quando o projecto foi criado"*: MOMENTO REAL (audit).
- *"Quando o projecto começa"*: DATA PURA (não tem hora, é semana de início).

## Storage — porque datas puras NÃO são `timestamptz`

`timestamptz` é o tipo correcto para **instantes**. Para um label de calendário
("dia X"), introduz problemas:

1. **Ambiguidade na leitura.** O Postgres converte `2026-04-14T00:00:00+00`
   para a session timezone do cliente. Em `psql` configurado para São Paulo,
   o utilizador vê `2026-04-13 21:00:00-03`. **Bug** — o "dia 14" passa a
   "dia 13" em algumas ferramentas.
2. **Quebra unique constraints.** `@@unique([weekId, workDate])` — se cada
   cliente guarda em fuso diferente, o "mesmo workDate" deixa de coincidir
   no instante UTC.
3. **Sem benefício.** A timezone é irrelevante quando a informação é "o dia X".
4. **Confunde os developers.** "Esta coluna é timestamptz, devo converter para
   tz do user no display?" — para `Notification.createdAt`, sim. Para
   `workDate`, não. Mistura tudo no mesmo tipo perde o sinal semântico.

A regra simples: **se a informação tem hora real → `timestamptz`. Se é só
"o dia X" → `timestamp` (sem tz, UTC midnight por convenção).**

## Timezone — apenas user.timezone (desde Mai 2026)

| Contexto | Timezone aplicada | Como |
|---|---|---|
| Qualquer rota | `user.timezone` | `<TimezoneProvider userTimezone={user.timezone}>` no AppLayout root e na PlanningPage |
| User sem `timezone` (estado inicial) | Detect browser via `Intl.DateTimeFormat().resolvedOptions().timeZone` | `useEffect` em AppLayout faz `PATCH /users/me/timezone` na primeira sessão |

Não existe mais `projectTimezone` no Provider. Todos os `useTimezone()` resolvem
para `user.timezone` (ou browser fallback).

## Pattern de uso

### Componentes React — momentos reais

```tsx
import { useTimezone } from '../contexts/TimezoneContext';
import { formatMoment, relativeTimeInTimezone } from '../lib/dateFormatting';

function MyComponent({ notification }) {
  const tz = useTimezone();
  // Para "há 5 minutos" tz-aware (com fallback absoluto > 30 dias):
  return <span>{relativeTimeInTimezone(notification.createdAt, tz, t)}</span>;
  // Para data absoluta sempre:
  // return <span>{formatMoment(notification.createdAt, tz)}</span>;
}
```

### Componentes React — datas puras

```tsx
import { useResolvedDateFormat } from '../contexts/ProjectDateFormatContext';
import { formatDate } from '../lib/dateFormatting';

function GanttRow({ task }) {
  const dateFormat = useResolvedDateFormat();
  return <span>{formatDate(task.startDate, dateFormat)}</span>;
}
```

> **Não importar `formatMoment` num componente que renderiza dates puras.**
> Vai fazer conversão errada (e.g., `workDate = 2026-04-14T00:00:00Z` em
> Tokyo aparece como "2026-04-14T09:00:00+09" e o display fica "09:00 of Apr
> 14" em vez de só "14 Apr").

### Backend — formatação na timezone

Backend tipicamente não formata datas (esse é trabalho do frontend), mas
quando precisa (notification body, audit text):

```typescript
import { formatInTimezone } from '../common/timezone/timezone.util';

const text = formatInTimezone(event.startAt, user.timezone ?? 'UTC');
```

## Edge cases

### DST (Daylight Saving Time)
`date-fns-tz` trata automaticamente. Não há lógica manual a fazer.

### Hora ambígua (relógio recua)
Em Outubro nas tz europeias, 02h00–03h00 acontece duas vezes. `date-fns-tz`
resolve por default para a **primeira ocorrência** (UTC+1 → UTC+0 transition).

### Hora inexistente (relógio adianta)
Em Março nas tz europeias, 02h00–03h00 não existe. `date-fns-tz` mapeia para
a **hora válida mais próxima** (geralmente 03h00).

### Comparações cross-tz
Se precisas de comparar momentos em tz diferentes, normaliza para UTC primeiro.
Comparações entre `Date` em JavaScript já são em UTC interno — **não tens que
fazer nada extra**.

## Dependências

- Backend: `date-fns-tz@^3.2.0` em `backend/package.json`. Helper em
  `backend/src/common/timezone/timezone.util.ts` (`isValidIanaTimezone`,
  `IsValidTimezone` validator class, `formatInTimezone`).
- Frontend: `date-fns-tz@^3.2.0` em `frontend/package.json`. Helpers em
  `frontend/src/lib/dateFormatting.ts` (`formatMoment`,
  `relativeTimeInTimezone`).

## API surface

| Tipo | Funções/componentes | Localização |
|---|---|---|
| Helper format (datas puras) | `formatDate`, `formatDateTime`, `formatDateShort`, `toFlatpickrFormat`, `toGanttFormat` | `frontend/src/lib/dateFormatting.ts` |
| Helper format (momentos reais) | `formatMoment(d, tz, fmt?)`, `relativeTimeInTimezone(d, tz, t, fmt?)` | idem |
| Hook tz | `useTimezone()`, `useTimezoneSource()` | `frontend/src/contexts/TimezoneContext.tsx` |
| Provider | `<TimezoneProvider userTimezone?>` | idem |
| Combobox tz | `<TimezoneSelect value onChange ... />` | `frontend/src/components/TimezoneSelect.tsx` (ainda usado para User.timezone) |
| Validator backend | `IsValidTimezone` (class-validator), `isValidIanaTimezone(tz)` | `backend/src/common/timezone/timezone.util.ts` |
| Endpoint | `PATCH /api/users/me/timezone` body `{ timezone: string \| null }` | `backend/src/users/users.controller.ts` |

## Anti-padrões

- ❌ **`@db.Timestamptz` para datas puras** (workDate, weekStart, project.startDate, GanttTask.startDate, HolidayDate.date). Quebra unique constraints e introduz ambiguidade na leitura. Manter `timestamp(3)` UTC midnight.
- ❌ **`formatMoment` para datas puras**. O helper converte para tz; uma data pura não tem tz. Resultado: "dia 14 em UTC" passa a "13" ou "15" em fusos extremos.
- ❌ **`formatDate` para momentos reais.** Não converte tz; o utilizador vê a hora UTC em vez da hora local.
- ❌ **`new Date()` em helpers de cálculo de "hoje" sem tz explícita.** Usa o fuso local da máquina, que pode divergir do user tz. Em `dateUtils.ts`, `currentWeekStart`/`currentMonthIso`/`isTodayISO` aceitam `tz` opcional — passar do `useTimezone()`.
- ❌ **Hardcodar IANA strings em DTOs.** Usar `@Validate(IsValidTimezone)` que verifica em runtime via `Intl.DateTimeFormat`.
- ❌ **Confiar no fallback browser sem persistir.** AppLayout tem effect que dispara `PATCH /users/me/timezone` na primeira sessão se `user.timezone === null`. Não saltar este passo.
- ❌ **Misturar datas puras e momentos no mesmo helper de display.** Quebra a regra primordial.
- ❌ **Adicionar `projectTimezone` ao TimezoneProvider** — foi removido em Mai 2026. O Provider só aceita `userTimezone`.
- ❌ **`tz` em `addBusinessHoursInclusive`** — a função é UTC-only desde Mai 2026. Business hours (workHours window) aplicam-se em UTC puro.
- ❌ **`parseWallClockInTimezone`/`formatWallClockInTimezone`** — removidos em Mai 2026. Usar `ganttToDate`/`formatGanttDate` (UTC puro) ou `new Date(isoString)`.

# Relacionados: @docs/claude/date-formatting.md @docs/claude/db.md @docs/claude/backend.md @docs/claude/frontend.md
