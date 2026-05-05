# Claude: carregar para tarefas que envolvam exibição/edição de datas

## O que é

Configuração de **formato de data por projecto**, exposta na aba "Região e
Idioma" do modal de edição de projecto. O formato escolhido propaga-se a
**todas as vistas dentro do contexto desse projecto** (Planning, Gantt,
Board, Calendar, Timesheet) e a todos os pickers (FlatPickr) usados nessas
vistas. Pages globais sem contexto de projecto caem no default
platform-wide.

## Modelo

Campo único no model `Project`:

```prisma
model Project {
  // ...
  /// Formato de data exibido neste projecto (ex.: 'DD/MM/YYYY').
  /// null ⇒ usa default platform-wide ('DD/MM/YYYY').
  dateFormat String?
}
```

Validação no DTO via `@IsIn([...PROJECT_DATE_FORMATS])`. Constante exportada
em [date-format.constant.ts](backend/src/projects/dto/date-format.constant.ts):

```typescript
export const PROJECT_DATE_FORMATS = [
  'DD/MM/YYYY',
  'DD-MM-YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
] as const;
```

## Resolução em runtime

```
project.dateFormat ?? PLATFORM_DEFAULT
```

Sem fallback runtime para User. **Não** existe (ainda) config user-level —
ver "Forward compatibility" abaixo.

## Helper central — [`frontend/src/lib/dateFormatting.ts`](frontend/src/lib/dateFormatting.ts)

```typescript
DEFAULT_DATE_FORMAT = 'DD/MM/YYYY'         // fallback de visualização
INITIAL_PROJECT_DATE_FORMAT = 'DD/MM/YYYY' // pré-preenchimento create-project (extension point)
DATE_FORMAT_OPTIONS                         // 4 presets para o select da UI

formatDate(input, fmt?)        // 'DD/MM/YYYY' etc.
formatDateTime(input, fmt?)    // + ' HH:mm' (24h, sempre)
formatDateShort(input, fmt?)   // sem ano, mantém ordem dia/mês — usado nos cabeçalhos do Timesheet
toFlatpickrFormat(fmt, withTime?)  // 'd/m/Y' / 'd/m/Y H:i'
toGanttFormat(fmt, withTime?)      // '%d/%m/%Y' / '%d/%m/%Y %H:%i'
```

`formatDate` aceita:
- `Date` válido,
- ISO 8601 (`'2025-12-31'`, `'2025-12-31T10:30:00Z'`),
- formato interno DHTMLX (`'DD-MM-YYYY HH:mm'`),
- `null` / `undefined` (devolve `'—'`).

## Context — [`ProjectDateFormatContext`](frontend/src/contexts/ProjectDateFormatContext.tsx)

```tsx
<ProjectDateFormatProvider projectFormat={project?.dateFormat}>
  {/* ... vistas dentro do projecto ... */}
</ProjectDateFormatProvider>

// Em qualquer descendente:
const dateFormat = useResolvedDateFormat();   // string sempre válida
formatDate(d, dateFormat);
```

Hoje só [`PlanningPage`](frontend/src/pages/PlanningPage.tsx) envolve com o
Provider. Pages globais (`ProjectsPage` listing, `HolidaysPage`,
`SessionsPage`, `NotificationPreferencesPage`, `AppLayout` notif dropdown)
**não** usam o Provider — chamam `formatDate(d)` directo (cai no
`DEFAULT_DATE_FORMAT`).

## Pattern para novos componentes

### Componente React puro (Planning, Timesheet, modais simples)

```tsx
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { formatDate } from '../../../lib/dateFormatting';

function MyComponent({ task }) {
  const dateFormat = useResolvedDateFormat();
  return <span>{formatDate(task.startDate, dateFormat)}</span>;
}
```

### FlatPickr (TaskModal, CalendarEventModal, ProjectsPage modal)

```tsx
const dateFormat = useResolvedDateFormat();
useEffect(() => {
  const fp = flatpickr(ref.current!, {
    enableTime: !allDay,
    dateFormat: toFlatpickrFormat(dateFormat, !allDay),
    time_24hr: true,
    // ...
  });
  return () => fp.destroy();
}, [showModal, allDay, dateFormat /* ← obrigatório no dep array */]);
```

A instância tem que ser **destruída e recriada** quando `dateFormat` muda
(FlatPickr não suporta `setOption('dateFormat', ...)` reactivo). O dep
array no `useEffect` garante isto automaticamente.

### DHTMLX Gantt (column templates, tooltip)

DHTMLX tem 2 formatos distintos:

- **Wire format** (`gantt.config.date_format = '%d-%m-%Y %H:%i'`) — usado
  para parse/serialização Date↔string entre o widget e a API. **NUNCA
  alterar** — quebra a comunicação com o backend (ver
  `dateToGanttStr`/`formatGanttDate` em
  [ganttDateUtils.ts](frontend/src/features/planning/ganttDateUtils.ts)).
- **Display format** — controlado pelo `template` de cada coluna. É **aqui**
  que o formato do projecto se aplica.

Pattern com `useRef` (porque os templates DHTMLX capturam closure estática):

```tsx
const dateFormatRef = useRef<string>('DD/MM/YYYY');

useEffect(() => {
  const fmt = project?.dateFormat ?? DEFAULT_DATE_FORMAT;
  dateFormatRef.current = fmt;
  if (!ganttInitialized.current) return;
  gantt.config.columns = buildColumns(visibleColumnsRef.current, tRef, endDateModeRef, dateFormatRef);
  gantt.render();   // re-render sem re-init (singleton intacto)
}, [project?.dateFormat]);

// Em buildColumns:
template: (task) => formatDate(task.start_date, dateFormatRef.current)
```

### DHTMLX Kanban (cardShape custom render)

Kanban PRO usa Svelte interno — `cardShape.start_date.format` aceita
sintaxe DHTMLX. Mas no nosso projecto as datas são renderizadas por
`injectCardBadges` (DOM custom em `.app-meta-row`), então o pattern é:

```tsx
useEffect(() => { dateFormatRef.current = dateFormat; }, [dateFormat]);

// Re-injectar quando dateFormat muda:
useEffect(() => {
  if (!boardInitialized.current) return;
  injectCardBadges(..., dateFormat);
}, [dateFormat]);
```

### FullCalendar (Calendar)

Props reactivas — sem `destroy()`. Para forçar 24h locale-neutral:

```typescript
new FullCalendar.Calendar(container, {
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
});
```

O modal de evento (FlatPickr) consome o context via `useResolvedDateFormat()`.

### Datas em template i18n

Quando uma string traduzida tem placeholder de data (ex.:
`"Período: {{start}} — {{end}}"`), **formatar antes de passar**:

```tsx
// ❌ Errado — vai mostrar a string ISO crua
t('month.project_period', { start: project.startDate, end: project.endDate });

// ✅ Correcto
t('month.project_period', {
  start: formatDate(project.startDate, dateFormat),
  end:   formatDate(project.endDate,   dateFormat),
});
```

## Pages globais (sem contexto de projecto)

Não usam o Provider. Chamam o helper directo — cai no `DEFAULT_DATE_FORMAT`:

```tsx
import { formatDate, formatDateTime } from '../lib/dateFormatting';

const formatDate = (iso) => formatDate(iso);  // wrapper local p/ retrocompat
```

Locais identificados (Abril 2026):
- [ProjectsPage.tsx](frontend/src/pages/ProjectsPage.tsx) — coluna data nos cards de projecto
- [HolidaysPage.tsx](frontend/src/pages/HolidaysPage.tsx) — datas de feriados
- [SessionsPage.tsx](frontend/src/pages/SessionsPage.tsx) — datetime de last activity
- [AppLayout.tsx](frontend/src/components/AppLayout.tsx) — só relativeTime (sem mudança)

Páginas cross-project que listam datas de **múltiplos projectos** (ex.:
"As minhas horas" / "Para aprovar" em `/timesheets`) também usam o default.
Razão: cada linha pode ser dum projecto com formato diferente; uniformizar
com o default platform-wide é a UX correcta.

## Forward compatibility — config user-level (futuro)

> A config do utilizador será **apenas o valor inicial pré-preenchido ao
> criar um projecto novo** — não é fallback runtime nem override de projectos
> existentes.

Quando essa fase chegar, **só muda 1 call-site**: o pré-preenchimento do
form de criação de projecto em
[ProjectsPage.tsx](frontend/src/pages/ProjectsPage.tsx). A constante
`INITIAL_PROJECT_DATE_FORMAT` torna-se uma função
`getInitialProjectDateFormat(user)`. Tudo o resto (helpers, Context, hook,
consumidores, pages globais) mantém-se sem alteração — `formatDate(d)` em
pages globais continua a usar `DEFAULT_DATE_FORMAT`, porque o user-level
não afecta visualização, só pré-preenchimento.

A separação intencional entre `DEFAULT_DATE_FORMAT` e
`INITIAL_PROJECT_DATE_FORMAT` (hoje iguais) marca este single point of
change.

## Wire format vs display format — regra crítica

| Formato | Onde | Pode mudar? |
|---|---|---|
| `DD-MM-YYYY HH:mm` (`dateToGanttStr`) | Wire entre FlatPickr↔DHTMLX↔backend planning | ❌ **Nunca** |
| `gantt.config.date_format = '%d-%m-%Y %H:%i'` | Parse interno DHTMLX | ❌ **Nunca** |
| Templates de colunas, tooltip, FlatPickr `dateFormat` | Display ao utilizador | ✅ Sim — via projecto |

Mudar o wire format quebra:
- DTO parsing no backend (`new Date(dto.startDate)` espera ISO).
- DHTMLX parse de strings ao carregar dados.
- Round-trip drag/drop (Date → string → backend → string → Date).

Por isso o `gantt.config.date_format` **mantém-se sempre** `'%d-%m-%Y %H:%i'`
e o display é controlado por templates explícitos em cada coluna.

## Permissão

`PROJECT_UPDATE` (já existe). Aplicada no `@Patch /projects/:id` no backend
e o botão "Editar" do projecto no frontend já é gated por essa permissão.

## i18n

Namespace `projects` — chaves específicas:
- `tab.general`, `tab.region_language`
- `form.date_format`, `form.date_format_hint`, `form.date_format_preview`
- `date_format.dmy_slash`, `date_format.dmy_dash`, `date_format.iso`,
  `date_format.mdy_slash`

Em 4 locales (`en`, `es`, `pt-BR`, `pt-PT`) em
[backend/prisma/seeds/translations/projects.json](backend/prisma/seeds/translations/projects.json).

## Anti-padrões

- ❌ `formatDate()` local hardcoded em novas pages — usar sempre o helper central.
- ❌ FlatPickr com `dateFormat: 'd-m-Y'` hardcoded — usar `toFlatpickrFormat(dateFormat, withTime)`.
- ❌ Mudar `gantt.config.date_format` — é o wire format, quebra parse de datas.
- ❌ `displayDate` de
  [ganttDateUtils.ts](frontend/src/features/planning/ganttDateUtils.ts) em
  novos call-sites — está deprecado.
- ❌ Passar data ISO crua a um template i18n com placeholder de data — formatar primeiro.
- ❌ Usar `useResolvedDateFormat()` em pages globais sem contexto de projecto
  — desnecessário, `formatDate(d)` já cai no DEFAULT.
- ❌ Pre-preencher `dateFormat` no create-project com `DEFAULT_DATE_FORMAT`
  — usar `INITIAL_PROJECT_DATE_FORMAT` (single point of change para o futuro user-level).
- ❌ `useEffect` que cria FlatPickr sem `dateFormat` no dep array — o picker
  fica congelado no formato inicial.
- ❌ Templates DHTMLX que capturam `dateFormat` por closure — usar `dateFormatRef.current`.

# Relacionados: @docs/claude/frontend.md @docs/claude/i18n.md @docs/claude/tools/gantt/rendering.md @docs/claude/tools/board/rendering.md @docs/claude/tools/calendar/rendering.md @docs/claude/tools/timesheet/rendering.md
