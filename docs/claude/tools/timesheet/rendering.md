# Claude: carregar para tarefas de layout e rendering Timesheet

## Tokens de cor — `frontend/src/features/timesheet/timesheet.css`

```css
:root {
  /* Status pills */
  --ts-pill-draft-bg:     #eef0f3;  --ts-pill-draft-fg:     #6b7280;
  --ts-pill-submitted-bg: #e8f0ff;  --ts-pill-submitted-fg: #2563eb;
  --ts-pill-approved-bg:  oklch(0.94 0.07 155);  --ts-pill-approved-fg:  oklch(0.42 0.13 155);
  --ts-pill-partial-bg:   oklch(0.94 0.07 75);   --ts-pill-partial-fg:   oklch(0.45 0.14 60);
  --ts-pill-rejected-bg:  oklch(0.94 0.07 25);   --ts-pill-rejected-fg:  oklch(0.50 0.18 25);

  /* Cell text */
  --ts-cell-approved-fg:  oklch(0.42 0.13 155);
  --ts-cell-submitted-fg: #2563eb;
  --ts-cell-rejected-fg:  oklch(0.50 0.18 25);

  /* Rejection banner */
  --ts-banner-bg:         oklch(0.96 0.04 25);
  --ts-banner-border:     oklch(0.85 0.10 25);
  --ts-banner-fg:         oklch(0.42 0.16 25);

  /* Today highlight */
  --ts-today-fg: var(--accent-violet, #7c5cff);
}
```

## Status pill (`<TimesheetStatusPill>`)

```tsx
function TimesheetStatusPill({ status }: { status: TimesheetWeekStatus }) {
  const map: Record<TimesheetWeekStatus, string> = {
    DRAFT:     'ts-pill ts-pill--draft',
    SUBMITTED: 'ts-pill ts-pill--submitted',
    APPROVED:  'ts-pill ts-pill--approved',
    PARTIAL:   'ts-pill ts-pill--partial',
    REJECTED:  'ts-pill ts-pill--rejected',
  };
  return <span className={map[status]}>{t(`status.${status.toLowerCase()}`)}</span>;
}
```

```css
.ts-pill {
  display: inline-flex; align-items: center;
  height: 24px; padding: 0 10px; border-radius: 999px;
  font-size: 11.5px; font-weight: 600;
}
.ts-pill--draft     { background: var(--ts-pill-draft-bg);     color: var(--ts-pill-draft-fg); }
.ts-pill--submitted { background: var(--ts-pill-submitted-bg); color: var(--ts-pill-submitted-fg); }
.ts-pill--approved  { background: var(--ts-pill-approved-bg);  color: var(--ts-pill-approved-fg); }
.ts-pill--partial   { background: var(--ts-pill-partial-bg);   color: var(--ts-pill-partial-fg); }
.ts-pill--rejected  { background: var(--ts-pill-rejected-bg);  color: var(--ts-pill-rejected-fg); }
```

## Layout — vista "As minhas horas" (project)

```
┌─ UnifiedToolbar (Row 1: 5 tabs + CTA "+ Adicionar lançamento") ─┐
├─ Row 2 = TimesheetWeekHeader: 
│  [subtabs mine|team] | [‹ ›] | "14 abr – 20 abr 2025" | <pill> | [Copiar semana] [Submeter semana | Editar semana | (none)]
└─ Conteúdo:
   ┌─ TimesheetGrid (.ts-table) ─────────────────────────┐
   │ ┌─────────┬─────┬─────┬─────┬─────┬─────┬───────┐  │
   │ │ TASK    │ SEG │ TER │ QUA │ QUI │ SEX │ TOTAL │  │
   │ │         │14/04│15/04│16/04│17/04│18/04│       │  │
   │ ├─────────┼─────┼─────┼─────┼─────┼─────┼───────┤  │
   │ │Revisão..│ 2h  │ 4h  │ [3] │ 3h  │  -  │  12h  │  │
   │ │  Apv.   │ Apv │ Apv │ rej.│ Sub │     │       │  │
   │ ├─────────┴─────┴─────┴─────┴─────┴─────┴───────┤  │
   │ │ Total/dia       4h     5.5h    3h rej.  3h    1h  16.5h │  │
   │ └─────────────────────────────────────────────────┘  │
   ├─ <TimesheetRejectionBanner> (vermelho, com motivo) ─┤
   └────────────────────────────────────────────────────┘
```

### Botões "Submeter semana" / "Editar semana" — condicional por estado

| `week.status` | Botão renderizado | Classe CSS |
|---|---|---|
| `DRAFT` | "Submeter semana" | `.ts-btn-submit-week` (violeta filled) |
| `REJECTED` | "Submeter semana" | `.ts-btn-submit-week` |
| `PARTIAL` | "Submeter semana" | `.ts-btn-submit-week` |
| `SUBMITTED` | "Editar semana" | `.ts-btn-edit-week` (laranja filled — acção reversível) |
| `APPROVED` | _(nenhum)_ | — semana imutável |

A toolbar usa estilos destacados (não `btn-primary-tb` simples) com gradiente
linear + box-shadow para diferenciar do `btn-ghost` adjacente ("Copiar semana"):

```css
.tb .ts-btn-submit-week {
  background: linear-gradient(180deg, #845adf 0%, #735adb 100%);
  color: #fff;
  box-shadow: 0 1px 2px rgba(115,90,219,0.18), 0 0 0 1px rgba(115,90,219,0.12);
}
.tb .ts-btn-edit-week {
  background: linear-gradient(180deg, #f5a623 0%, #ee8e15 100%);
  color: #fff;
  box-shadow: 0 1px 2px rgba(238,142,21,0.20), 0 0 0 1px rgba(238,142,21,0.14);
}
```

## `<TimesheetGrid>`

```tsx
<div className="ts-table">
  <table>
    <thead>
      <tr>
        <th>{t('table.col.task')}</th>
        {days.map((d) => (
          <th key={d.dateISO} className={`day${d.isToday ? ' is-today' : ''}`}>
            {d.label}<span className="d-num">{d.short}</span>
          </th>
        ))}
        <th className="total">{t('table.col.total')}</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.taskPublicId}>
          <td className="task-cell">
            <div className="nm">{row.taskName}</div>
            <div className="proj">{row.projectName}</div>
          </td>
          {days.map((d) => (
            <td key={d.dateISO} className="day">
              <TimesheetCell row={row} day={d} canEdit={canEditCell(d)} ... />
            </td>
          ))}
          <td className="total">{formatHours(row.total)}</td>
        </tr>
      ))}
    </tbody>
    <tfoot>
      <tr>
        <td>{t('table.row.day_total')}</td>
        {days.map((d) => (
          <td key={d.dateISO} className={`day${d.status === 'REJECTED' ? ' day-rejected' : ''}`}>
            {d.status === 'REJECTED'
              ? `${formatHours(d.total)} rej.`
              : formatHours(d.total)}
          </td>
        ))}
        <td className="total">{formatHours(weekTotal)}</td>
      </tr>
    </tfoot>
  </table>
</div>
```

```css
.ts-table { width: 100%; background: #fff; border: 1px solid var(--border-card);
            border-radius: 10px; overflow: hidden; font-size: 12.5px; }
.ts-table table { width: 100%; border-collapse: collapse; }
.ts-table th, .ts-table td { padding: 10px 12px; text-align: left; vertical-align: top; }
.ts-table thead th { background: #fafbfc; border-bottom: 1px solid var(--border-card);
                     font-size: 10.5px; font-family: 'JetBrains Mono', monospace;
                     text-transform: uppercase; letter-spacing: 0.06em;
                     color: var(--text-tertiary); font-weight: 500; }
.ts-table thead th.day { text-align: center; width: 78px; }
.ts-table thead th.day .d-num { display: block; font-family: 'Inter', sans-serif;
                                text-transform: none; letter-spacing: 0;
                                font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; }
.ts-table thead th.day.is-today { color: var(--ts-today-fg); }
.ts-table thead th.total { text-align: right; width: 64px; color: var(--text-secondary); }
.ts-table tbody tr + tr td { border-top: 1px solid var(--border-soft); }
.ts-table .task-cell .nm { color: var(--text-primary); font-weight: 500; }
.ts-table .task-cell .proj { font-size: 11.5px; color: var(--text-tertiary); margin-top: 2px; }
.ts-table td.day { text-align: center; font-variant-numeric: tabular-nums; }
.ts-table td.total { text-align: right; font-weight: 600; }
.ts-table tfoot td { border-top: 1px solid var(--border-card); background: #fafbfc;
                     font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.ts-table tfoot td.day { text-align: center; font-variant-numeric: tabular-nums; }
.ts-table tfoot td.total { text-align: right; color: var(--text-primary); font-weight: 700; }
.ts-table .day-rejected { color: var(--ts-cell-rejected-fg); }
```

## `<TimesheetCell>`

A célula distingue **criação** (`onUpsert` → `POST /entries`) de **edição**
(`onUpdate(entry.publicId, hours)` → `PATCH /entries/:id`):

- Se a célula está **vazia** (`entry === null`) → POST. Backend faz upsert e
  agrega se já existir (REQ-G20). Usado também pelo modal "Adicionar lançamento".
- Se a célula **já tem valor** (`entry !== null`) → PATCH. **Substitui** o
  valor (sem agregar). Crítico para a edição inline: digitar `3` num campo
  com `4` deve ficar `3`, não `7`.

O input usa `type="text"` + `inputMode="decimal"` (não `type="number"`) para
**eliminar o handler nativo das setas**. Em Chromium recente, o nativo de
`type="number"` com `step="any"` ignora o `preventDefault()` em keydown e
incrementa em `±1` a partir do `min` (resultado: empty → ↑ → `0.1` por causa
do clamp, depois ↑ → `1.1` por +1 nativo). Com `type="text"`, todo o controlo
das setas passa pelo nosso `bumpHalf`, que faz snap a múltiplos de 0.5.

Comportamento exacto das setas:
- Empty + ↑ → `0.5` (primeiro múltiplo válido)
- Empty + ↓ → ignora
- `1.3` + ↑ → `1.5` · `1.3` + ↓ → `1.0`
- `0.5` + ↓ → empty (apaga)
- `0.1` (digitado manualmente) + ↑ → `0.5` · `0.1` + ↓ → empty

Como `type="text"` não tem spinner nativo, **o input está envolto numa span
`.ts-cell-input-wrap`** com 2 botões absolutos no canto direito (chevrons up/
down). Os botões usam `onMouseDown + e.preventDefault()` para **manter o foco
do input** durante o clique (caso contrário onBlur dispararia commit a meio do
ciclo do clique). O mesmo `bumpHalf(direction)` é chamado tanto pelas setas do
teclado como pelos botões — comportamento idêntico.

```tsx
<span className="ts-cell-input-wrap">
  <input type="text" inputMode="decimal" ... />
  <span className="ts-cell-input-spin" aria-hidden="true">
    <button type="button" tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); bumpHalf(1); }}>
      <i className="ri-arrow-up-s-fill" />
    </button>
    <button type="button" tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); bumpHalf(-1); }}>
      <i className="ri-arrow-down-s-fill" />
    </button>
  </span>
</span>
```

CSS — sempre visíveis a 55% opacity, full no hover/focus do wrap:

```css
.ts-cell-input-wrap { position: relative; display: inline-block; width: 48px; height: 28px; }
.ts-cell-input-wrap > .ts-cell-input { width: 100%; padding: 0 14px 0 4px; }
.ts-cell-input-spin {
  position: absolute; right: 1px; top: 1px; bottom: 1px; width: 12px;
  display: flex; flex-direction: column;
  pointer-events: none; opacity: 0.55; transition: opacity 100ms ease;
}
.ts-cell-input-wrap:hover .ts-cell-input-spin,
.ts-cell-input-wrap:focus-within .ts-cell-input-spin { opacity: 1; }
.ts-cell-input-spin button { pointer-events: auto; flex: 1; ... }
```

```tsx
function TimesheetCell({ entry, day, canEdit, onUpsert, onUpdate, onDelete }: Props) {
  if (!canEdit && !entry) return <span>–</span>;
  if (day.status === 'APPROVED' || day.status === 'SUBMITTED') {
    /* ... read-only render como antes ... */
  }
  return (
    <EditableCell
      initial={entry ? entry.hours : null}
      onCommit={(value) => {
        if (value === null) onDelete();
        else if (entry) onUpdate(entry.publicId, value); // EXISTENTE → PATCH
        else            onUpsert(value);                  // NOVA      → POST
      }}
    />
  );
}

function EditableCell({ initial, onCommit }: EditableProps) {
  const [value, setValue] = useState(initial !== null ? String(initial) : '');
  /* ↑/↓ snap a múltiplos de 0.5 — bumpHalf calcula o próximo múltiplo */
  function bumpHalf(direction: 1 | -1) { /* ... */ }
  return (
  return (
    <span className="ts-cell-input-wrap">
      <input
        type="text"
        inputMode="decimal"  /* teclado numérico mobile, sem stepper nativo */
        autoComplete="off"
        value={value}
        onChange={onChangeText} /* regex: só dígitos, '.', ',' */
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp')   { bumpHalf(1);  e.preventDefault(); }
        if (e.key === 'ArrowDown') { bumpHalf(-1); e.preventDefault(); }
        if (e.key === 'Enter')  (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setValue(String(initial ?? '')); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}
```

```css
.ts-cell-h         { display: block; font-weight: 600; font-size: 13px; color: var(--text-primary); }
.ts-cell-h--submitted { color: var(--ts-cell-submitted-fg); }
.ts-cell-h--approved  { color: var(--ts-cell-approved-fg); }
.ts-cell-h--rejected  { color: var(--ts-cell-rejected-fg); }
.ts-cell-state     { font-size: 10.5px; margin-top: 3px; font-weight: 500; }
.ts-cell-state--approved  { color: var(--ts-cell-approved-fg); }
.ts-cell-state--submitted { color: var(--ts-cell-submitted-fg); }
.ts-cell-state--rejected  { color: var(--ts-cell-rejected-fg); }
.ts-cell-input {
  width: 48px; height: 28px; border: 1px solid var(--border-card); border-radius: 6px;
  background: #fff; text-align: center; font: inherit; font-size: 13px;
  color: var(--text-primary); padding: 0 4px; font-variant-numeric: tabular-nums; outline: none;
}
.ts-cell-input:focus { border-color: var(--accent-violet); box-shadow: 0 0 0 3px rgba(124,92,255,0.15); }
.ts-cell-input.is-rejected { border-color: oklch(0.70 0.15 25); }
```

## `<TimesheetRejectionBanner>`

REQ-G11 — só renderiza se há ≥ 1 dia rejeitado na semana.

```tsx
<div className="ts-rejection">
  <strong>{t('rejection_banner.label', { date: formatDate(day.workDate) })}:</strong>
  &nbsp;{day.rejectionReason}
</div>
```

```css
.ts-rejection {
  margin-top: 12px; padding: 10px 14px;
  background: var(--ts-banner-bg);
  border: 1px solid var(--ts-banner-border);
  border-left-width: 3px; border-radius: 8px;
  font-size: 12px; color: var(--ts-banner-fg); line-height: 1.5;
}
.ts-rejection strong { font-weight: 600; }
```

## Layout — vista "Equipa do projeto"

```
┌─ UnifiedToolbar (Row 1: 5 tabs) ─┐
├─ Row 2 = TimesheetStatusFilters:
│  [subtabs mine|team] | "ESTADO" | <chips: Todos(6) Submetidos(2) Aprovados(1) Rejeitados(1) Parciais(1) Draft(1)> | [history btn]
└─ Conteúdo (.ts-frame com grid 220px / 1fr):
   ┌──────────────┬─────────────────────────────────────┐
   │ Sidebar      │ TimesheetTeamPersonHeader:          │
   │              │   [Don Draper] <pill submitted>     │
   │ EQUIPA DO    │   "Semana 14-20 abr · 24h lançadas" │
   │ PROJETO      │   [Aprovar semana][Aprovar mês]     │
   │ • BC  Apv    │   [Rejeitar dia][Ver histórico]     │
   │ • DD  Sub *  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
   │ • JH  Par    │   [‹ ›] "14 abr – 20 abr 2025"      │
   │ • PC  Rej    │ <TimesheetGrid mode="team"/>        │
   │ • RS  Drf    │                                     │
   └──────────────┴─────────────────────────────────────┘
```

> **Nota**: a sidebar mostra **apenas** "EQUIPA DO PROJETO". O próprio
> utilizador acede às suas horas pela tab "As minhas horas" no toolbar — não
> precisa de uma entry dedicada na sidebar (REQ refinado pelo utilizador,
> Abril 2026). Auto-selecção: ao entrar na vista 'team', o primeiro membro
> da equipa (excluindo o próprio) é seleccionado automaticamente.

## `<TimesheetTeamSidebar>`

```tsx
<aside className="ts-aside">
  <div>
    <div className="ts-aside__lbl">{t('team.section_team')}</div>
    {rows.filter((r) => r.user.publicId !== selfPublicId).map((p) => (
      <PersonRow key={p.publicId} person={p} active={p.publicId === viewedUserPublicId}
                 onClick={() => setViewedUser(p.publicId)} />
    ))}
  </div>
</aside>
```

```css
.ts-aside { background: #fff; border: 1px solid var(--border-card);
            border-radius: 10px; padding: 14px;
            display: flex; flex-direction: column; gap: 16px; }
.ts-aside__lbl { font-family: 'JetBrains Mono', monospace; font-size: 9.5px;
                 text-transform: uppercase; letter-spacing: 0.08em;
                 color: var(--text-tertiary); margin: 0 2px 8px; }
.ts-person { display: flex; align-items: center; gap: 10px;
             padding: 8px; border-radius: 8px; cursor: pointer;
             transition: background 120ms ease; }
.ts-person:hover { background: var(--hover-bg, #f5f6f8); }
.ts-person.is-active { background: var(--accent-violet-soft, #f1edff); }
.ts-avatar { width: 30px; height: 30px; border-radius: 50%;
             display: flex; align-items: center; justify-content: center;
             color: #fff; font-size: 10.5px; font-weight: 600; flex-shrink: 0; }
.ts-person__main { flex: 1; min-width: 0; }
.ts-person__nm { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.ts-person__sub { font-size: 11.5px; color: var(--text-tertiary); margin-top: 1px; }
.ts-person.is-active .ts-person__sub { color: var(--accent-violet); font-weight: 500; }
```

## Avatares

Reutilizar `avatarColorFor(id)` (paleta `AVATAR_PALETTE`) já existente em
`features/board/components/...` ou centralizar em `lib/avatar.ts`.

```typescript
const AVATAR_PALETTE = ['#845adf', '#23b7e5', '#26bf94', '#f5b849', '#49b6f5', '#e6533c'];

function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initialsOf(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}
```

## `<TimesheetRejectDayModal>` — selector de dia + motivo

**Refinamento Abril 2026**: o modal pede QUAL dia rejeitar, não auto-pica o
primeiro SUBMITTED.

```tsx
<select value={workDate} onChange={(e) => setWorkDate(e.target.value)}>
  {submittedDays.map((d) => (
    <option key={d.publicId} value={d.workDate}>
      {dayOfWeekLabelPT(d.workDate)} — {formatDate(d.workDate)}
    </option>
  ))}
</select>
<small className="text-muted">{t('reject_day.repeat_hint')}</small>

<textarea
  value={reason}
  onChange={(e) => setReason(e.target.value)}
  placeholder={t('reject.reason_placeholder')}
  required
/>
```

Quando `submittedDays.length === 0`, o modal mostra `reject_day.no_submitted_days`
e desactiva o botão Submit. Para rejeitar dias diferentes com motivos diferentes,
o gestor abre o modal várias vezes — cada chamada é uma transacção separada e
gera 1 linha em `TimesheetApprovalLog`.

## Confirmações (Swal sem ícone)

```typescript
import { confirmAction } from '@/lib/confirm';

const ok = await confirmAction({
  title:       t('confirm.approve_week.title'),
  text:        t('confirm.approve_week.text', { user: row.user.name }),
  confirmText: t('confirm.approve_week.confirm'),
  cancelText:  tc('actions.cancel'),
  variant:     'success',  // 'primary' | 'danger' | 'warning' | 'success'
});
if (!ok) return;
// ... acção
```

O helper baseia-se no padrão **Confirm Alert** do template Zynix
(`A:/Arquivos/zynix_template/dist/html/sweet_alerts.html`) com 3 ajustes
específicos:
1. **Sem ícone** (decisão do utilizador, Abril 2026).
2. Botões com classes Bootstrap `btn-{variant}` em vez do styling default do Swal.
3. Textos sempre em i18n nos 4 locales (`confirm.<action>.title/text/confirm`,
   `cancelText` reutiliza `common:actions.cancel`).

## Modais

Padrão Zynix (idêntico a `CalendarEventModal`):

```tsx
<>
  <div className="modal fade show d-block" tabIndex={-1} role="dialog">
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">{/* fields */}</div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{tc('actions.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{title === 'add' ? t('add_entry.btn_add') : t('copy_week.btn_copy')}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div className="modal-backdrop fade show"></div>
</>
```

`document.body.style.overflow = 'hidden'` enquanto aberto (cleanup no return do effect).

## `<TimesheetCopyWeekModal>` — warning amber

REQ-C08:

```tsx
{destinationHasData && (
  <div className="ts-copy-warning">
    {t('copy_week.warning')}
  </div>
)}
```

```css
.ts-copy-warning {
  background: oklch(0.95 0.05 90);
  border: 1px solid oklch(0.85 0.08 90);
  border-radius: 6px; padding: 8px 10px;
  font-size: 11.5px; color: oklch(0.42 0.10 70);
  line-height: 1.45; margin-top: 8px;
}
```

## Página global `/timesheets`

```
┌─ Header ──────────────────────────────────────────────┐
│ Timesheets                       [As minhas | Para aprovar] │
├──────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐ │
│ │ Todos os projetos                              ▾  │ │
│ ├───────────────────────────────────────────────────┤ │
│ │ Todas as semanas                               ▾  │ │
│ ├───────────────────────────────────────────────────┤ │
│ │ Todos os estados                               ▾  │ │
│ └───────────────────────────────────────────────────┘ │
│ (apenas tab Para aprovar:)                            │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Todos os utilizadores                          ▾  │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ <TimesheetMyTable> ou <TimesheetApprovalsTable>       │
└──────────────────────────────────────────────────────┘
```

### `<TimesheetMyTable>`

| Projecto | Semana | Estado | Horas | (acção) |
|----------|--------|--------|-------|---------|
| Alpha | 14–20 abr 2025 | <pill Parcial> | 16.5h | [Abrir] |

`[Abrir]` navega para `/projects/:projectPublicId/planning?tab=timesheet&week=YYYY-MM-DD`.
PlanningPage lê os query params e força `pageTab='timesheet'` + `weekStart` no `useTimesheetData`.

### `<TimesheetApprovalsTable>`

| Utilizador | Projecto | Semana | Horas | (acções) |
|------------|----------|--------|-------|----------|
| (avatar AS) Alpha-Sousa | Alpha | 14–20 abr | 16.5h | [Aprovar] [Rejeitar] |

- `[Aprovar]` → `confirmAction()` (Swal sem ícone, variant=success) → chama
  `POST /api/timesheets/approvals/week`. Optimistic remove da linha;
  toast `success.week_approved`.
- `[Rejeitar]` abre `<TimesheetRejectModal>` (motivo obrigatório). Submit
  chama `POST /api/timesheets/rejections/week`. Optimistic remove; toast.

## Botões condicionais — `<TimesheetTeamPersonHeader>` (Abril 2026)

Lógica baseada em `hasSubmittedDays` e `hasFinalisedDays` (calculados a partir
de `tsData.data.days`):

```typescript
const hasSubmittedDays = days.some((d) => d.status === 'SUBMITTED');
const hasFinalisedDays = days.some((d) => d.status === 'APPROVED' || d.status === 'REJECTED');
```

| Estado da semana | Mostra |
|------------------|--------|
| `SUBMITTED` (há ≥1 dia SUBMITTED) | Aprovar semana · Aprovar mês · Rejeitar dia(s) |
| `APPROVED` / `REJECTED` / `PARTIAL` (sem SUBMITTED) | **Editar aprovação semana** · **Editar aprovação mês** |
| `DRAFT` (sem submetidos pendentes nem decisões finais) | Apenas histórico |

> Os dois conjuntos são mutuamente exclusivos no mesmo momento (nova semântica:
> PARTIAL = APPROVED+REJECTED apenas, sem SUBMITTED). A excepção é durante uma
> transição muito rara em que ambos coexistem — nesse caso mostram-se ambos.

Cada acção dispara `confirmAction()` (helper Swal sem ícone, ver
`frontend/src/lib/confirm.ts`):
- Aprovar (week/month) → variant=`success`
- Editar (week/month) → variant=`warning`
- Rejeitar dia → o próprio modal `<TimesheetRejectDayModal>` é a confirmação
  (com selector de dia + motivo).

### Filtros independentes por tab

Manter dois objects de state:
```tsx
const [myFilters, setMyFilters] = useState<GlobalFilters>({ projectPublicId: null, weekStart: null, status: null });
const [approvalsFilters, setApprovalsFilters] = useState<GlobalFilters & { userPublicId: string | null }>({
  projectPublicId: null, weekStart: null, status: null, userPublicId: null,
});
```

Mudar de tab NÃO reseta os filtros do outro.

### Tab "Para aprovar" gated

Hook `useTimesheetApprovalAccess()`:
```tsx
function useTimesheetApprovalAccess(): { hasAccess: boolean; loading: boolean }
```

Chama `GET /api/timesheets/has-approval-access`. Se 200 + `hasAccess=true`,
mostra a tab; caso contrário esconde-a.

## Vista mensal — `<TimesheetMonthView>` (Abril 2026)

Layout flexbox: FullCalendar dayGridMonth à esquerda + coluna SEMANA à direita.
Ambas as colunas partilham o mesmo height via `align-items: stretch`.

```tsx
<div className="tsm-month">
  <div ref={containerRef} className="tsm-cal" />        {/* FullCalendar */}
  <div className="tsm-weeks">                            {/* Coluna SEMANA */}
    <div className="tsm-weeks__hd">{t('month.week_col')}</div>
    {data.weeks.map((w) => (
      <button
        type="button"
        key={w.weekStart}
        className={`tsm-weeks__cell tsm-weeks__cell--${w.status}`}
        disabled={w.status === 'out_of_range' || w.status === 'mixed'}
        onClick={() => onWeekClick(w.weekStart)}
      >
        <div className="tsm-weeks__num">{t('month.sem_n', { n: w.weekNumber })}</div>
        <div className="tsm-weeks__status">{t(`month.week_status.${w.status}`)}</div>
        <div className="tsm-weeks__cta">{t('month.see_details')} →</div>
      </button>
    ))}
  </div>
</div>
```

### Cores das células (CSS)

```css
.tsm-cal .tsm-day--complete { background: oklch(0.96 0.05 155); }   /* verde */
.tsm-cal .tsm-day--partial  { background: oklch(0.96 0.06 75); }    /* âmbar */
.tsm-cal .tsm-day--pending  { background: oklch(0.97 0.04 25); }    /* vermelho-claro */
.tsm-cal .tsm-day--future   { background: #fff; }                    /* branco */
.tsm-cal .tsm-day--weekend  { background: #fafbfc; }                 /* cinza-muito-claro */
.tsm-cal .tsm-day--out {
  background: repeating-linear-gradient(135deg,
    transparent 0, transparent 6px,
    rgba(0,0,0,0.04) 6px, rgba(0,0,0,0.04) 7px), #fafbfc;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Badge X/Y vs ✓/✗

Injectado via `dayCellDidMount` (e re-aplicado via useEffect[data]):

```css
.tsm-cal .tsm-day__count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
```

### Coluna SEMANA — cores por estado

```css
.tsm-weeks__cell--complete { background: oklch(0.96 0.05 155); }
.tsm-weeks__cell--partial  { background: oklch(0.96 0.06 75); }
.tsm-weeks__cell--pending  { background: oklch(0.97 0.04 25); }
.tsm-weeks__cell--future,
.tsm-weeks__cell--mixed,
.tsm-weeks__cell--out_of_range { background: var(--ts-bg-page); }
```

### Sidebar — entry "Vista agregada" (apenas em mensal)

```tsx
<TimesheetTeamSidebar
  rows={teamData.data.rows}
  selfPublicId={selfPublicId}
  selectedUserPublicId={viewedUserPublicId}    /* null = agregado */
  onSelect={setViewedUserPublicId}
  showAggregated={teamView === 'monthly'}      /* só na mensal */
  aggregatedCount={teamMembers.length}
/>
```

A entry "Vista agregada":
- Avatar com badge mostrando o total de membros.
- Activa quando `selectedUserPublicId === null`.
- Click → `setViewedUserPublicId(null)` → modo agregado (X/Y).
- Quando um membro é seleccionado → modo individual (✓/✗).

## Anti-padrões

- ❌ Hardcodar cores em vez de usar tokens CSS — quebra dark mode no futuro
- ❌ Usar `display: none` sem `aria-hidden` quando o tab está inactivo
- ❌ `<input type="number">` para a célula de horas — handler nativo das setas
  com `step="any"` salta `±1` ignorando `preventDefault()` em alguns browsers.
  Usar `type="text"` + `inputMode="decimal"` e tratar ↑/↓ totalmente em JS.
- ❌ Edição inline duma célula com valor existente via `POST /entries` — soma
  em vez de substituir (REQ-G20 só agrega na primeira criação). Usar
  `PATCH /entries/:id` para edição.
- ❌ Banner de rejeição como toast — REQ-G11 quer banner persistente abaixo da grelha
- ❌ Avatar com cor random (não-determinística) — usar `avatarColorFor(id)`
- ❌ Resetar filtros ao trocar de tab na página global (REQ explícito do utilizador)
- ❌ Mostrar tab "Para aprovar" para qualquer user — só com `hasAccess=true`

# Relacionados: @docs/claude/tools/timesheet/overview.md @docs/claude/tools/timesheet/interactions.md @docs/claude/frontend.md
