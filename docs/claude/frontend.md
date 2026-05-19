# Claude: carregar para tarefas de frontend, React ou UI

## Padrões de componentes

- Modais controlados por estado React: classes `modal fade show d-block` + `modal-backdrop fade show`.
- `document.body.style.overflow = 'hidden'` via `useEffect` quando modal está aberto.
- Erros da API: suporta `message: string | string[]` (formato NestJS `ValidationPipe`).
- Assets Zynix: `frontend/public/assets/` → URL `/assets/`.
- Scripts do template carregados em `AppLayout` via `useEffect` (após React montar DOM).

## Sistema de Toasts (react-hot-toast)

```typescript
import { useToast } from '../contexts/ToastContext';
const { showToast } = useToast();

showToast('success', 'Criado com sucesso.');   // CREATE/UPDATE/DELETE OK
showToast('danger',  'Erro ao guardar.');       // erros API/rede
showToast('info',    'Convite reenviado.');     // operações informativas
showToast('warning', 'Limite próximo.');        // avisos não bloqueantes
```

- `ToastProvider` em `App.tsx`, dentro de `<AuthProvider>`.
- `<Toaster>` posicionado em `top-right`, `duration: 4000ms`.
- **Nunca usar `alert()` ou `window.alert()`** — substituir sempre por `showToast('danger', msg)`.
- Erros inline de formulário (`setFormError`) mantêm-se — são validações de campo, não toasts.

**Stale closure em event handlers (ex: Gantt `attachEvent`):**
```typescript
const showToastRef = useRef(showToast);
useEffect(() => { showToastRef.current = showToast; }, [showToast]);
// dentro do handler: showToastRef.current('danger', 'Erro.');
```

## Proxy e API

- `getApiBase()` retorna `/api` (sempre relativo — nunca URL absoluta com host).
- Vite proxy: `/api` → `http://awesome-project-app-backend:3000`.
- Todas as chamadas autenticadas: `Authorization: Bearer ${token}`.

## Template Zynix — FlatPickr (campos de data)

### Legacy `frontend/` — script global

Carregado via `loadScript('/assets/libs/flatpickr/flatpickr.min.js')` em
`AppLayout.tsx`. Declaração global no consumidor:

```typescript
declare const flatpickr: (el: HTMLElement, opts?: object) => { destroy(): void };

const fpRef = useRef<HTMLInputElement>(null);
useEffect(() => {
  if (!fpRef.current || typeof flatpickr === 'undefined') return;
  const fp = flatpickr(fpRef.current, {
    enableTime: true, dateFormat: 'd-m-Y H:i', time_24hr: true,
    defaultDate: existingValue || null,
    onChange: ([date]) => setState(s => ({ ...s, field: date?.toISOString() ?? '' })),
  });
  return () => fp.destroy();
}, [showModal]);
```

### `frontend2/` — wrapper React `<DatePicker />` (Mai 2026)

FlatPickr instalado via npm (`flatpickr@^4.6.x`). CSS importada uma vez em
[main.tsx](frontend2/src/main.tsx) (`import 'flatpickr/dist/flatpickr.min.css'`).
Todos os call-sites usam o wrapper [DatePicker.tsx](frontend2/src/lib/DatePicker.tsx):

```tsx
import { DatePicker } from '../../../lib/DatePicker';

<DatePicker
  value={form.start_date}              // string formatada conforme `format`
  onChange={(s) => setForm((f) => ({ ...f, start_date: s }))}
  format="d-m-Y H:i"                   // sintaxe FlatPickr
  enableTime
  placeholder="DD-MM-YYYY HH:mm"
  disabled={!canEdit}
/>
```

**Locales suportados** (resolvidos pelo wrapper via `i18next.language`):

- `pt-PT` / `pt-BR` / `pt` → `Portuguese` (flatpickr/dist/l10n/pt)
- `es` → `Spanish` (flatpickr/dist/l10n/es)
- `en` (e fallback) → `english` (flatpickr/dist/l10n/default)

> `flatpickr@4.x` **não tem** locale separado para `pt-BR`. O ficheiro `pt.js`
> serve ambas as variantes. NÃO importar locales que não existam no package.

**Re-init quando `enableTime` muda**: o wrapper destrói e recria a instância
internamente (FlatPickr não aceita troca reactiva). Útil para toggles tipo
"Hora exata" no TaskModal — quando o utilizador alterna `durationUnit`
DAY ↔ HOUR, o picker passa de data pura para datetime.

**Helper canónico** `toFlatpickrFormat(fmt?, withTime?)` em
[dateFormatting.ts](frontend2/src/lib/dateFormatting.ts) — converte um
`ProjectDateFormat` (`DD/MM/YYYY`, `DD-MM-YYYY`, ...) para a sintaxe FlatPickr.

**Anti-padrões**:
- ❌ Chamar `flatpickr()` directo em código novo do `frontend2/` — usar sempre o `<DatePicker />`.
- ❌ Hardcodar `'d-m-Y'`, `'d/m/Y'`, etc. em call-sites — usar `toFlatpickrFormat(projectDateFormat, withTime)`.
- ❌ `<input type="date">` ou `type="datetime-local">` nativo em código novo — UX inconsistente entre browsers, sem locale i18n.

## Template Zynix — Choices.js (selects)

```typescript
declare const Choices: new (el: HTMLElement, opts?: object) => {
  destroy(): void; setChoiceByValue(v: string): void
};

const choicesRef = useRef<HTMLSelectElement>(null);
useEffect(() => {
  if (!showModal || typeof Choices === 'undefined') return;
  const c = new Choices(choicesRef.current!, {
    searchEnabled: false, itemSelectText: '', shouldSort: false
  });
  return () => c.destroy();
}, [showModal]);
```

> Instâncias criadas quando o modal abre e destruídas no cleanup do `useEffect`.

## Template Zynix — Outros padrões

- **Tabs:** Default Nav Tabs com `data-bs-toggle="tab"` (Bootstrap nativo) — sem `activeTab` em state React.
- **Breadcrumbs:** classe `breadcrumb-style2`, ícones `ti ti-*` (Tabler Icons).
- **Alinhamento global obrigatório:** ao adoptar componente Zynix, rever **todas** as páginas existentes para alinhar ao mesmo padrão.

## Frame visual unificado das ferramentas (PlanningPage)

Todas as tabs de [PlanningPage.tsx](frontend/src/pages/PlanningPage.tsx) — Planning,
Gantt, Board, Calendar, Timesheet — partilham o mesmo wrapper visual abaixo da
toolbar. Implementação: helper local `viewFrameStyle(active)` definida perto da
declaração de `viewFullscreen`:

```typescript
const viewFrameStyle = (active: boolean): CSSProperties => ({
  border: '1px solid #e6e4f0',
  borderRadius: '8px 8px 0 0',
  overflow: 'hidden',
  boxShadow: '0 2px 12px rgba(115,93,255,0.07)',
  background: '#fff',
  display: active ? 'flex' : 'none',
  flexDirection: 'column',
  flex: viewFullscreen && active ? 1 : undefined,
  minHeight: 0,
});
```

**Body branco uniforme**: o wrapper externo é branco e cada tab adapta o
interno para combinar:
- **Planning:** `<div style={viewFrameStyle(true)}>` + wrapper interno com `padding: 16px` (sem background próprio — herda o branco). Substitui o antigo `card.custom-card`.
- **Gantt:** usa a helper directamente (`viewFrameStyle(pageTab === 'gantt')`). O gantt grid já é branco internamente.
- **Board:** envolve o `#kanban_here`. `--wx-kanban-background: #fff` (era `#fafbfc`) injectado em [useBoardInit.ts](frontend/src/features/board/useBoardInit.ts). Os cards têm `border: 1px solid #e8eaee` + `box-shadow` — continuam visíveis em fundo branco. O `display: 'none'` migra do container interno para o wrapper externo. **Regra "display:none pattern"** continua válida — o `kanban_here` permanece sempre no DOM.
- **Calendar:** envolve o `.calendar-layout`. `.calendar-sources-panel` e `.calendar-main` já são brancos.
- **Timesheet:** envolve o `<TimesheetView>`. O `.ts-frame` em `timesheet.css` tem `background: #fff` (era `var(--ts-bg-page)`).

**Em fullscreen** (`viewFullscreen=true`), o wrapper **mantém** border-radius e box-shadow (preserva identidade visual do frame) e ganha `flex: 1` para preencher o `viewWrapperRef` (que cobre a viewport via `position: fixed; inset: 0`).

Ao adicionar uma nova ferramenta tab, **envolver em `<div style={viewFrameStyle(pageTab === 'novo')}>`** — nunca usar `card.custom-card` ou container directo sem frame, e nunca aplicar background cinza nos elementos internos.

## Anti-padrões

- ❌ `alert()` / `window.alert()` — usar `showToast('danger', msg)`
- ❌ `activeTab` em state para tabs Zynix — usar `data-bs-toggle="tab"`
- ❌ URL absoluta em `fetch` — usar `getApiBase()` relativo
- ❌ Estado React directamente em `attachEvent` — usar `useRef`
- ❌ Nova tab em `PlanningPage` sem `viewFrameStyle(...)` — quebra a uniformidade visual das ferramentas
- ❌ Background cinza nos elementos internos das tabs (ex.: `--wx-kanban-background: #fafbfc`, `.ts-frame { background: var(--ts-bg-page) }`) — quebra a uniformidade do body branco
- ❌ Adicionar `viewFullscreen ? 0 : ...` ao border-radius/shadow do wrapper — fullscreen mantém o frame visualmente intacto

# Relacionados: @docs/claude/i18n.md @docs/claude/auth.md @docs/claude/tools/gantt/overview.md
