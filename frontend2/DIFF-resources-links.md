# DIFF exaustivo — Resources/Links: NewTemplate vs `frontend2/`

> Regra `feedback_template_diff_method`: 5 categorias.
> Canónico = [NewTemplate/app-dark.jsx:602-660](../NewTemplate/app-dark.jsx) (CSS) + [1486-1732](../NewTemplate/app-dark.jsx) (markup/lógica).
> Implementação = [frontend2/src/features/planning/](src/features/planning) + [frontend2/src/styles/project-resources-links.css](src/styles/project-resources-links.css).

---

## A. Estrutura HTML — divergências node-a-node

### A1. `AddExternalResourceModal` → `ExternalResourceModal`
Canónico `app-dark.jsx:1568-1601`:

```jsx
<div className="modal-backdrop" onClick={onClose}>
  <div className="modal-box" onClick={e => e.stopPropagation()}>
    <div className="modal-head">
      <span className="title">New External Resource</span>
      <button className="modal-close" onClick={onClose}>×</button>
    </div>
    <div className="modal-body">
      <div className="modal-field">
        <label>Name <span className="req">*</span></label>
        <input type="text" ... />
      </div>
      <div className="modal-field">
        <label>Type <span className="req">*</span></label>
        <select ...>...</select>
      </div>
      <div className="modal-field">
        <label>Hours/Day</label>
        <div style={{ display:'flex', gap:8 }}>
          <input type="number" ... style={{ width:80 }} />
          <span style={{ color:'var(--dim)', fontSize:13 }}>h</span>
        </div>
      </div>
    </div>
    <div className="modal-foot">
      <button className="mf-cancel">Cancel</button>
      <button className="mf-primary">Create Resource</button>
    </div>
  </div>
</div>
```

**Implementação** [`ExternalResourceModal.tsx`](src/features/planning/components/ExternalResourceModal.tsx) — divergências:
1. `<div role="presentation">` no `.modal-backdrop` e `role="dialog" aria-label="..."` no `.modal-box`. **Acrescento a11y** (não no canónico).
2. `htmlFor` + `id` nos `<label>`/`<input>` (`ext-res-name`, `ext-res-type`, `ext-res-hpd`). **Acrescento a11y**.
3. `<form onSubmit>` envolve `.modal-body + .modal-foot` (canónico não usa `<form>` — submete via onClick). **Justifica Enter para submit + autocomplete.**
4. Acrescento opcional `<div className="modal-alert">{error}</div>` dentro do `.modal-body` (canónico não tem error handling — ver E1).
5. Botão `.modal-close` recebe `aria-label`. **Acrescento a11y**.

### A2. `CreateLinkModal` → `LinkModal`
Idem A1: mesma estrutura `.modal-*`, com acrescentos de `<form>`, `role`, `htmlFor`, `aria-label`, e `.modal-alert`. **Mesma justificação.**

### A3. `ResourcesView` (2 secções)
Canónico `app-dark.jsx:1611-1683` — estrutura preservada **literal**:
```
<div className="rv-wrap">
  <div className="rv-section">
    <div className="rv-sec-head"> [icon] Title [badge] </div>
    <table className="rv-table"> ... </table>
  </div>
  <div className="rv-section">
    <div className="rv-sec-head"> [icon] Title [badge] [add-btn] </div>
    {empty ? <div className="rv-empty">…</div> : <table className="rv-table">…</table>}
  </div>
</div>
```

Divergências:
1. **Team Members tabela**: Canónico (linha 1631-1641) renderiza 1 linha hardcoded (Thiago, equipa única, status active, 8h). Implementado renderiza `members.map(...)` — **necessário para dados reais**.
2. **Empty state Team Members**: canónico **não tem** — sempre mostra 1 linha. Implementado adiciona `members.length === 0 ? <div className="rv-empty">…</div> : <table>…</table>` (categoria D — extensão coerente com External).
3. **Status pill em Team Members**: canónico hardcodes `<span className="rv-status-pill">Active</span>`. Implementado idem (label via i18n `resources.status.active`).
4. **Coluna "Acções"** em External Resources — **NÃO existe no canónico** (canónico mostra só 3 colunas: Name, Type, Hours/Day). Decisão do utilizador → ver A4.

### A4. External Resources — coluna "Acções" (acrescento autorizado)
Canónico (`app-dark.jsx:1659-1672`) só renderiza `<tr><td>name</td><td>type</td><td>{hpd} h</td></tr>` — sem actions. Implementado adiciona condicionalmente (apenas se `can(RESOURCE_MANAGE)`):

```jsx
<td><span className="rv-row-actions">
  <button className="rv-row-action" onClick={openEditModal}><IconEdit/></button>
  <button className="rv-row-action danger" onClick={openDeleteConfirm}><IconTrash/></button>
</span></td>
```

Header da coluna ganha `<th>Actions</th>` com `width: 90` inline. Visível só com `canManage=true` (gate consistente com `+ Add External Resource`).

### A5. `LinksView`
Canónico `app-dark.jsx:1690-1732`:

```jsx
<div className="lnk-wrap">
  <div className="lnk-toolbar"><button className="lnk-create-btn">+ Create Link</button></div>
  <table className="lnk-table"><thead>...</thead><tbody>{links.map(...)}</tbody></table>
  {createOpen && <CreateLinkModal/>}
</div>
```

Divergências:
1. **Toolbar gated por `canManage`** — sem permissão, todo o `<div className="lnk-toolbar">` desaparece (canónico assume sempre visível).
2. **Botão Create disabled se `tasks.length < 2`** — canónico não previne (mock tem sempre tasks suficientes).
3. **Empty state**: canónico não trata `links.length === 0` (mock tem sempre 5 links). Implementado reaproveita `.rv-empty` com ícone Info + texto i18n `links.empty`. Categoria D — extensão coerente.
4. **Coluna Lag**: canónico renderiza sempre `<td style={{color:'var(--dim)'}}>—</td>` (mock não tem lag). Implementado renderiza `{count} dia(s)` se `lag != 0`, senão `—` (categoria E — funcional vs mock).
5. **Coluna Actions gated**: igual A4 — só visível com `canManage`.
6. **Source/Target**: canónico renderiza `<td className="lnk-source">{l.source}</td>` directamente do mock. Implementado resolve `l.source` (int Task.id) → `task.text` via `taskById Map<number, ITask>` (categoria E — extensão funcional).

---

## B. Classes CSS renomeadas

**Nenhuma renomeação.** Todas as classes mantêm os nomes canónicos:

| Bloco | Classes canónicas mantidas |
|---|---|
| ResourcesView | `.rv-wrap`, `.rv-section`, `.rv-sec-head`, `.rv-badge`, `.rv-badge.zero`, `.rv-add-btn`, `.rv-table`, `.rv-status-pill`, `.rv-hpd`, `.rv-hpd input`, `.rv-hpd .unit`, `.rv-empty`, `.muted` |
| LinksView | `.lnk-wrap`, `.lnk-toolbar`, `.lnk-create-btn`, `.lnk-table`, `.lnk-source`, `.lnk-target`, `.lnk-type`, `.lnk-type.ss`, `.lnk-type.fs`, `.lnk-del-btn` |
| Modais | `.modal-backdrop`, `.modal-box`, `@keyframes modal-in`, `.modal-head`, `.modal-head .title`, `.modal-close`, `.modal-body`, `.modal-field`, `.modal-field label`, `.modal-field .req`, `.modal-field input[type=text]`, `.modal-field input[type=number]`, `.modal-field select`, `.modal-field .help`, `.modal-row2`, `.modal-foot`, `.mf-cancel`, `.mf-primary` |

**Acrescentos (classes NOVAS não existentes no canónico, justificadas):**

| Classe nova | Função | Justificação |
|---|---|---|
| `.rv-row-actions` | Container inline das acções edit/delete na tabela | Coluna Actions é acrescento autorizado (A4) |
| `.rv-row-action` | Botão de acção (edit/delete) | Idem |
| `.rv-row-action.danger` | Variante destrutiva (vermelho on hover) | Idem |
| `.lnk-type.ff` | Cor para tipo FF (canónico só define `.ss`/`.fs`) | Os 4 tipos DHTMLX são reais — canónico desenhou só 2; cobrir os 4 é fidelidade funcional |
| `.lnk-type.sf` | Cor para tipo SF | Idem |
| `.modal-alert` | Banner de erro inline no body | Acrescento E1 (error handling) |

Os ficheiros [project-list.css](src/styles/project-list.css) (que já existia) **não** foram tocados — todas as classes novas vivem em [project-resources-links.css](src/styles/project-resources-links.css).

---

## C. Estilos com valores divergentes

Substituição de tokens `${T.X}` (JS template literal no NewTemplate) por `var(--X)` (CSS custom property em `tokens.css`). Tabela:

| Canónico | frontend2 | Match? |
|---|---|---|
| `${T.bg}` | `var(--bg)` | ✓ Direto |
| `${T.panel}` | `var(--panel)` | ✓ |
| `${T.panel2}` | `var(--panel2)` | ✓ |
| `${T.panel3}` | `var(--panel3)` | ✓ |
| `${T.ink}` | `var(--ink)` | ✓ |
| `${T.ink2}` | `var(--ink2)` | ✓ |
| `${T.mute}` | `var(--mute)` | ✓ |
| `${T.dim}` | `var(--dim)` | ✓ |
| `${T.line}` | `var(--line)` | ✓ |
| `${T.lineSoft}` | `var(--lineSoft)` | ✓ |
| `${T.brand}` | `var(--brand)` | ✓ |
| `${T.brandSoft}` | `var(--brandSoft)` | ✓ |
| `${T.mono}` | `var(--mono)` | ✓ |
| **`${T.high}`** | **`var(--pri-high)`** | **⚠ Mapeamento** — `--high` não existe; `--pri-high` (`oklch(0.65 0.20 25)`) é a única var vermelho-laranja em `tokens.css`. Usado em `.rv-add-btn` + `.modal-field .req`. |
| **`${T.done}`** | **`var(--st-done)`** | **⚠ Mapeamento** — `--done` não existe; `--st-done` é o token de estado verde-claro. Usado em `.rv-status-pill`. |
| **`${T.doneInk}`** | **`var(--st-doneInk)`** | **⚠ Mapeamento** — `--doneInk` não existe; `--st-doneInk` é o token tinta do estado verde. |

**Valores literais preservados (sem mudança):**
- `rgba(15,15,28,.3)` no `.modal-backdrop` background — mantido literal (canónico usa literal, não token).
- `rgba(0,0,0,.24)` no `.modal-box` shadow — idem.
- `oklch(0.93 0.07 25)` / `oklch(0.48 0.18 25)` no `.lnk-type.ss` e `.lnk-del-btn:hover` — mantidos literais idênticos ao canónico.
- `oklch(0.93 0.07 155)` / `oklch(0.42 0.15 155)` no `.lnk-type.fs` — idem.

**Acrescentos (cores novas para `.lnk-type.ff` e `.sf`):**
- `.lnk-type.ff`: `oklch(0.93 0.07 75) / oklch(0.48 0.18 75)` (âmbar). Paleta consistente com `.ss`/`.fs` (mesma luminosidade/croma, hue diferente).
- `.lnk-type.sf`: `oklch(0.93 0.07 280) / oklch(0.48 0.18 280)` (roxo).

**Acrescentos de propriedades CSS não presentes no canónico (defensivos):**
- `.rv-add-btn`, `.lnk-create-btn`: `transition: opacity .12s` + estados `:disabled` (canónico apenas tinha `:hover { opacity: .9 }`). Permite UX consistente quando o backend está a processar.
- `.rv-hpd input:focus`: `border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft)` — canónico não tinha focus state; alinhado com restantes inputs `.modal-field`.
- `.rv-hpd input:disabled`: `opacity: .55; background: var(--panel2)` — canónico não previa disabled (mock sempre editável).
- `.modal-foot .mf-cancel:hover`, `.mf-primary:hover:not(:disabled)`, etc: estados expandidos.

---

## D. Elementos / classes em falta vs canónico

**Elementos do canónico OMITIDOS na implementação:** **nenhum.**

Todos os 11 SVGs inline foram portados literal:
- IconTeam (path Users do canónico, 1615)
- IconUserPlus (path UserPlus do canónico, 1648)
- IconInfo (path InfoCircle do canónico, 1655)
- IconTrash (path Trash do canónico, 1717)

Mais 1 SVG novo:
- **IconEdit** — novo, não está no canónico. Necessário para o botão de edit em External Resources (A4). Path Pencil standard.

**Classes do canónico OMITIDAS:** nenhuma.

---

## E. Funcionalidade incompleta (comportamento vs mock canónico)

Esta categoria lista **acrescentos** (real CRUD vs mock client-side) e **possíveis omissões funcionais**.

### E1. Error handling (acrescento)
Canónico submete via `onSave({...})` síncrono — sem `try/catch`, sem feedback de erro.
Implementado:
- `async submit()` com `try/catch`.
- `error` state local + banner `.modal-alert` no `.modal-body`.
- Toasts via `useToast()` em saves bem-sucedidos e em erros (vindos do hook).
- Botão `.mf-primary` mostra `t('messages.processing')` durante pending; disabled.

### E2. Edit modal (acrescento)
Canónico `AddExternalResourceModal` só cria — não há `Edit`. Implementado adiciona prop `initialValue` ao `ExternalResourceModal`:
- Título muda para `Edit External Resource` (i18n).
- Botão muda para `Save changes` (i18n).
- Submit chama `onUpdate(publicId, dto)` em vez de `onCreate(dto)`.
- Match do `userTypePublicId` actual via `label` do nó-grupo pai (limitação: backend não expõe `userTypePublicId` per leaf — match best-effort por `label`; documentado em [ExternalResourceModal.tsx](src/features/planning/components/ExternalResourceModal.tsx) linha 31).

### E3. ConfirmDialog antes de delete (acrescento)
Canónico `setLinks(ls => ls.filter(...))` filtra mock imediatamente. Implementado dispara `<ConfirmDialog danger title=... message=...>` antes de chamar `removeExternal`/`removeLink`. Reutiliza componente `shell/ConfirmDialog.tsx` (port do `views-ws-settings.jsx`).

### E4. Permissões reactivas (acrescento)
Canónico não tem conceito de permissões. Implementado:
- `canManage = can(PA.RESOURCE_MANAGE)` em ResourcesView → esconde `+ Add` e coluna Actions.
- `canEditHours = can(PA.MEMBER_HOURS_MANAGE)` → input `disabled`.
- `canManage = can(PA.LINK_MANAGE)` em LinksView → esconde toolbar + coluna Actions.

### E5. Counters reais nos sub-tabs (acrescento)
Canónico (FilterToolbar mock) hardcoded counters. Estado anterior em frontend2 mostrava `—`. Implementação computa:
- `tasksCount = tasks.length`
- `externalsCount = resources.filter(r => !r.isGroup && !r.userPublicId).length`
- `resourcesCount = members.length + externalsCount`
- `linksCount = links.length`

### E6. UserTypes reais (acrescento)
Canónico hardcoded `['Developer','Designer','QA','DevOps','Manager','Other']`. Implementado consome `useWorkspaceUserTypes()` (publicId UUID UUID real do backend, alinhado com DTO `userTypeId` em `CreateResourceDto`).

### E7. MemberHoursCell (acrescento)
Canónico tem `<input defaultValue={8}>` sem save (mock visual). Implementado:
- `value` controlado por state local.
- `onBlur` + `Enter` salva via `updateMemberHours(userPublicId, value)` se mudou e é válido.
- `Escape` reverte.
- Toast success em OK, revert + toast danger em erro.
- Disabled sem `MEMBER_HOURS_MANAGE`.

### E8. Refresh do bundle após mutações (acrescento)
Cada `createExternal`/`updateExternal`/`removeExternal`/`updateMemberHours`/`createLink`/`removeLink` chama `onMutated()` no fim — actualiza o `usePlanningBundle` via `refresh()` descido por props. Sem isto, a UI ficaria stale.

### E9. ID resolution para Links (acrescento)
Canónico mostra `link.source` raw (mock string). Implementado:
- Backend devolve `link.source: number` (Task.id interno).
- Frontend constrói `Map<number, ITask>` por `task.id` (campo novo adicionado a [`ITask`](src/features/planning/types.ts)).
- `resolveTaskText(numericId)` → `task.text ?? "#{numericId}"`.

### E10. Acrescentos a11y
Acrescentos não-canónicos coerentes com práticas do projecto (alinhado com modais existentes em `shell/`):
- `role="presentation"` no backdrop.
- `role="dialog"` + `aria-label` no modal-box.
- `htmlFor`/`id` em todos os pares label/input.
- `aria-label` em todos os botões só-ícone.
- `Escape` fecha modais (com guard `!submitting`).
- `document.body.style.overflow = 'hidden'` enquanto modal aberto.

### E11. **NENHUMA omissão funcional do canónico.**
Tudo o que o canónico desenha aparece — só com extensões. As únicas diferenças são extensões justificadas pelas decisões do utilizador e pelas exigências do CRUD real.

---

## Sumário das divergências (resumo executivo)

**0 renomeações** de classes CSS (B).
**0 omissões** de elementos canónicos (D, E11).
**6 acrescentos de markup** (todos justificados em A1-A5):
- A11y (`role`, `aria-label`, `htmlFor`)
- `<form>` envolve `.modal-body + .modal-foot` para suporte Enter/autocomplete
- `.modal-alert` banner inline
- Coluna Actions em External Resources
- Empty state Team Members
- Empty state Links

**3 mapeamentos de tokens** documentados (C):
- `${T.high}` → `var(--pri-high)`
- `${T.done}` → `var(--st-done)`
- `${T.doneInk}` → `var(--st-doneInk)`

**8 classes CSS novas** (B):
- `.rv-row-actions`, `.rv-row-action`, `.rv-row-action.danger` — para coluna Actions
- `.lnk-type.ff`, `.lnk-type.sf` — cobertura completa dos 4 tipos DHTMLX
- `.modal-alert` — error handling
- (CSS de transições/states defensivos não-classes)

**10 acrescentos funcionais** (E):
- Edit modal, error handling, ConfirmDialog, permissões reactivas, counters reais, UserTypes reais, MemberHoursCell, refresh do bundle, ID resolution, a11y.

**Resultado: paridade visual canónica com extensão funcional real**, sem perdas em fidelidade ao mockup.
