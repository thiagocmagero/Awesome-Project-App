# Sistema de Configuração Gantt

Documentação do sistema de configuração em 3 níveis para o DHTMLX Gantt Pro v9.0.3.

---

## 1. Arquitectura — 3 Níveis de Configuração

As configurações do Gantt são resolvidas por precedência crescente:

```
HARDCODED_DEFAULTS  <  GLOBAL  <  USER  <  PROJECT
```

| Nível | Quem define | Quando se aplica |
|-------|------------|------------------|
| `HARDCODED_DEFAULTS` | Código (imutável) | Sempre — base de fallback |
| `GLOBAL` | PLATFORM_ADMIN via `/settings/gantt` → tab Global | Todos os utilizadores sem config USER/PROJECT |
| `USER` | Qualquer utilizador via `/settings/gantt` → tab Utilizador | Sobrepõe GLOBAL; é sobreposto por PROJECT |
| `PROJECT` | Qualquer utilizador via ícone ⚙️ no navbar do Gantt | Específico por projecto — máxima prioridade |

A resolução é feita pelo backend com `deepMerge` de 2 níveis:
```typescript
{ ...base.columns, ...override.columns }  // idem para colors, behavior, defaults
```

---

## 2. Modelo de Dados

```prisma
enum GanttConfigScope { GLOBAL  USER  PROJECT }

model GanttConfig {
  id        Int              @id @default(autoincrement())
  publicId  String           @unique @default(uuid(7))
  scope     GanttConfigScope
  userId    Int?             // null para GLOBAL
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId Int?             // null para GLOBAL e USER
  project   Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  config    Json             // GanttConfigData
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([scope, userId, projectId])
}
```

**Nota:** o campo `config` é um `Json` com a seguinte estrutura TypeScript:

```typescript
interface GanttConfigData {
  columns: {
    start_date: boolean;
    end_date: boolean;
    owner: boolean;
    duration: boolean;
  };
  colors?: {
    taskBar?: string;        // hex — barras de tarefas normais
    taskBarProject?: string; // hex — barras de tarefas tipo projecto
    milestone?: string;      // hex — marcadores de milestone
    links?: string;          // hex — setas de dependência
    todayMarker?: string;    // hex — linha vertical "hoje"
    // células
    weekendColor?: string;        // hex — cor base das células de fim de semana (default: '#9aa5b4')
    weekendPattern?: CellPattern; // padrão das células de fim de semana (default: 'diagonal')
    holidayColor?: string;        // hex — cor base das células de feriado (default: '#ff9a13')
    holidayPattern?: CellPattern; // padrão das células de feriado (default: 'diagonal')
  };
  behavior?: {
    dragMove?: boolean;          // arrastar tarefa horizontalmente
    dragResize?: boolean;        // redimensionar tarefa
    dragLinks?: boolean;         // criar dependência por drag
    dragProgress?: boolean;      // arrastar barra de progresso
    openTreeInitially?: boolean; // expandir árvore ao carregar
  };
  defaults?: {
    zoomLevel?: number; // 0-4 (índice em ZOOM_LEVELS = [10,18,30,50,80] px)
  };
}
```

---

## 3. Endpoints da API

Base: `GET|PUT /api/gantt-config/*` — todos protegidos por JWT.

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/gantt-config/resolve` | JWT | Config resolvida USER+GLOBAL para o utilizador autenticado |
| `GET` | `/gantt-config/resolve/:projectId` | JWT | Config resolvida PROJECT+USER+GLOBAL |
| `GET` | `/gantt-config/global` | JWT + PLATFORM_ADMIN | Config GLOBAL raw (registo Prisma completo) |
| `PUT` | `/gantt-config/global` | JWT + PLATFORM_ADMIN | Upsert config GLOBAL |
| `GET` | `/gantt-config/user` | JWT | Config USER raw do utilizador autenticado |
| `PUT` | `/gantt-config/user` | JWT | Upsert config USER |
| `GET` | `/gantt-config/project/:projectId` | JWT | Config PROJECT raw (userId + projectId) |
| `PUT` | `/gantt-config/project/:projectId` | JWT | Upsert config PROJECT |

**Nota:** os endpoints GET de raw (`/global`, `/user`, `/project/:id`) devolvem o registo Prisma completo `{ id, publicId, scope, config, ... }`. O campo `config` contém o `GanttConfigData`. Os endpoints `/resolve` devolvem apenas o `GanttConfigData` já resolvido.

---

## 4. Hook `useGanttConfig`

**Ficheiro:** `frontend/src/hooks/useGanttConfig.ts`

```typescript
import { useGanttConfig, type GanttConfigColors, type CellPattern } from '../hooks/useGanttConfig';
import { buildCellCSS, getCellPatternPreviewStyle, CELL_PATTERN_OPTIONS, CELL_STYLE_FIELDS } from '../lib/ganttPatterns';

// Sem projectId → resolve USER+GLOBAL (para GanttSettingsPage)
const { config, loading, updateUserConfig } = useGanttConfig();

// Com projectId → resolve PROJECT+USER+GLOBAL (para PlanningPage)
const { config, loading, updateProjectConfig } = useGanttConfig(projectId);
```

- **Sem cache de sessão** — a config pode mudar durante a sessão.
- `updateProjectConfig(c)` e `updateUserConfig(c)` são optimistas: actualizam o estado local imediatamente e chamam a API em background. Devolvem `Promise<boolean>` — `false` em caso de erro.
- Passar sempre a config completa (não só a secção alterada): `{ ...ganttConfig, columns: next }`.

---

## 5. Aplicação de Cores em Runtime

As cores são aplicadas por injecção de CSS no `<head>` via `applyGanttColors()` em `PlanningPage.tsx`.

### Elemento injectado
```html
<style id="gantt-custom-colors">
  .gantt_task_line:not(.gantt_project):not(.gantt_milestone) { background-color: #xxx; border-color: #xxx; }
  .gantt_task_line:not(.gantt_project):not(.gantt_milestone) .gantt_task_progress { ... }
  .gantt_task_line.gantt_project { background-color: #xxx; border-color: #xxx; }
  .gantt_task_line.gantt_milestone { background-color: #xxx; border-color: #xxx; }
  .gantt_task_link .gantt_line_wrapper div { background-color: #xxx; }
  .gantt_task_link .gantt_link_arrow { border-color: #xxx !important; }
  .gantt_today_marker { background-color: #xxx; }
  /* Células — geradas por buildCellCSS() de ganttPatterns.ts */
  .weekend { background-color: rgba(r,g,b,0.10) !important; background-image: ... !important; }
  .holiday { background-color: rgba(r,g,b,0.10) !important; background-image: ... !important; }
</style>
```

### CSS de células — estratégia de override

As células `.weekend` e `.holiday` têm CSS hardcoded com `!important` no bloco estático. Quando o utilizador configura cor/padrão, `applyGanttColors` gera regras com `buildCellCSS()` que também usam `!important`. Como o `<style id="gantt-custom-colors">` é acrescentado ao `<head>` **após** o CSS estático, e ambos têm igual especificidade + `!important`, a regra **mais recente no DOM vence** — o override funciona sem tocar no CSS base.

```typescript
// buildCellCSS está em frontend/src/lib/ganttPatterns.ts
if (colors.weekendColor || colors.weekendPattern) {
  const hex     = (colors.weekendColor  ?? '#9aa5b4') as string;
  const pattern = (colors.weekendPattern ?? 'diagonal') as CellPattern;
  rules.push(buildCellCSS('.weekend', hex, pattern));
}
if (colors.holidayColor || colors.holidayPattern) {
  const hex     = (colors.holidayColor  ?? '#ff9a13') as string;
  const pattern = (colors.holidayPattern ?? 'diagonal') as CellPattern;
  rules.push(buildCellCSS('.holiday', hex, pattern));
}
```

### Ciclo de vida
1. **Init do Gantt** (`useEffect` de inicialização): `applyGanttColors(ganttConfig.colors)` após todos os `gantt.config.*`.
2. **Mudança de config** (`useEffect` dependente de `ganttConfig.colors`): re-aplica automaticamente quando o utilizador altera cores no offcanvas.
3. **`handleColorChange`** (offcanvas PROJECT): aplica visualmente em tempo real + persiste via `updateProjectConfig`.
4. **Unmount da página**: `document.getElementById('gantt-custom-colors')?.remove()`.

### Cores predefinidas (DHTMLX padrão, usadas no color picker quando sem config)
```typescript
const DEFAULT_COLORS = {
  taskBar:        '#3db9d3',
  taskBarProject: '#65c16f',
  milestone:      '#e84e4e',
  links:          '#9db9d3',
  todayMarker:    '#ff4040',
};
```

---

## 6. UI de Configuração

### 6.1 `/settings/gantt` — GanttSettingsPage

| Tabs externas | Quem acede |
|--------------|-----------|
| Global | PLATFORM_ADMIN |
| Utilizador | Todos |

Cada tab externa tem 4 tabs internas geridas por React state (`InnerTab`):

| Tab interna | Conteúdo |
|-------------|---------|
| **Colunas** | Toggles de visibilidade das colunas da grelha |
| **Cores** | Color pickers por elemento + subsecção "Padrões de Células" (cor + preview + select de padrão) |
| **Comportamento** | Toggles para drag_move, drag_resize, drag_links, drag_progress, open_tree_initially |
| **Defaults** | Select para nível de zoom predefinido (0–4) |

Um único botão "Guardar" por tab externa envia a config completa (`columns + colors + behavior + defaults`) num único PUT.

### 6.2 Offcanvas PROJECT no Gantt

Aberto pelo ícone ⚙️ no navbar do Gantt. Contém 2 tabs internas:

| Tab | Conteúdo |
|-----|---------|
| **Colunas** | Toggles de visibilidade (fire-and-forget, optimista) |
| **Cores** | Color pickers com `handleColorChange` — visual imediato + persistência; subsecção "Padrões de Células" |

Repor cor de tarefa/link/etc. chama `handleColorChange(key, DEFAULT_COLORS[key])`.
Repor célula (fim-de-semana/feriado) chama `handleCellStyleReset(colorKey, patternKey, defaultColor)` que repõe ambos cor e padrão de uma só vez.

---

## 7. Comportamento — Flags Gantt

| Flag `GanttConfigBehavior` | `gantt.config` correspondente | Default |
|---------------------------|-------------------------------|---------|
| `dragMove` | `gantt.config.drag_move` | `true` |
| `dragResize` | `gantt.config.drag_resize` | `true` |
| `dragLinks` | `gantt.config.drag_links` | `true` |
| `dragProgress` | `gantt.config.drag_progress` | `true` |
| `openTreeInitially` | `gantt.config.open_tree_initially` | `true` |

Aplicados no init do Gantt se presentes na config resolvida. Não são re-aplicados após init (requerem reload da página).

---

## 8. Zoom Levels

```typescript
const ZOOM_LEVELS = [10, 18, 30, 50, 80]; // min_column_width em px
const DEFAULT_ZOOM_INDEX = 2; // 30px
```

| Índice | px | Label |
|--------|-----|-------|
| 0 | 10 | Muito próximo |
| 1 | 18 | Próximo |
| 2 | 30 | Normal (predefinido) |
| 3 | 50 | Afastado |
| 4 | 80 | Muito afastado |

`defaults.zoomLevel` na config aplica-se **apenas no init** (primeira abertura). O utilizador pode alterar o zoom durante a sessão com os botões do toolbar sem afectar a config persistida.

---

## 9. Regras de Desenvolvimento

1. **Qualquer nova configuração de comportamento do Gantt** deve ser implementada nos 3 níveis (GLOBAL, USER, PROJECT) seguindo este padrão. Nunca usar `useState` local para configurações que devem persistir entre sessões.

2. **Ao adicionar um novo campo a `GanttConfigData`**, actualizar em simultâneo:
   - `frontend/src/hooks/useGanttConfig.ts` — interfaces TypeScript
   - `backend/src/gantt-config/gantt-config.service.ts` — interface + deepMerge
   - `backend/src/gantt-config/dto/upsert-gantt-config.dto.ts` — DTO (com `@IsOptional()`)
   - `frontend/src/pages/GanttSettingsPage.tsx` — UI de configuração
   - `frontend/src/pages/PlanningPage.tsx` — aplicação em runtime + offcanvas PROJECT

3. **CSS injection vs CSS custom properties**: o DHTMLX Gantt Pro v9 não expõe CSS custom properties para todos os elementos. A abordagem correcta é injectar um `<style>` com seletores específicos (ver secção 5).

4. **Stale closures em `gantt.attachEvent`**: handlers de eventos DHTMLX são registados uma vez no init. Aceder a `ganttConfig` dentro desses handlers causaria stale closure. Para evitar, usar refs:
   ```typescript
   const ganttConfigRef = useRef(ganttConfig);
   useEffect(() => { ganttConfigRef.current = ganttConfig; }, [ganttConfig]);
   ```
   (Actualmente os event handlers não acedem a `ganttConfig` directamente — a config é aplicada no init e em `useEffect` separados.)

5. **`PLATFORM_ADMIN` bypassa FeatureFlagGuard e PlanLimitGuard** — vê sempre a tab Gantt independentemente da feature flag `gantt_view`.

6. **Migração**: o modelo `GanttConfig` requer a migração `gantt_config`. Se o backend falhar com "table gantt_config does not exist", executar:
   ```bash
   npx prisma migrate deploy
   ```

---

## 10. Ficheiros Críticos

| Ficheiro | Função |
|---------|--------|
| `backend/prisma/schema.prisma` | Enum `GanttConfigScope` + modelo `GanttConfig` |
| `backend/src/gantt-config/gantt-config.service.ts` | Lógica de resolução e upsert |
| `backend/src/gantt-config/gantt-config.controller.ts` | 8 endpoints REST |
| `backend/src/gantt-config/dto/upsert-gantt-config.dto.ts` | Validação do corpo do PUT |
| `frontend/src/hooks/useGanttConfig.ts` | Hook React + interfaces TypeScript (`CellPattern`, `GanttConfigColors`) |
| `frontend/src/lib/ganttPatterns.ts` | `buildCellCSS`, `getCellPatternPreviewStyle`, `CELL_PATTERN_OPTIONS`, `CELL_STYLE_FIELDS` |
| `frontend/src/pages/PlanningPage.tsx` | `applyGanttColors`, `handleColorChange`, `handleCellStyleReset`, offcanvas PROJECT |
| `frontend/src/pages/GanttSettingsPage.tsx` | UI de configuração Global/User com tabs por tipo |

---

## 11. DHTMLX Gantt — Integração e Padrões

**Assets:** `frontend/public/assets/libs/dhtmlxgantt/` (dhtmlxgantt.js + dhtmlxgantt.css). Carregados via `<script>` no `index.html`. `gantt` é um singleton global UMD — **nunca chamar `gantt.destructor()`** durante a sessão.

**Ordem de init DHTMLX v9:** `plugins → config → init → parse`.

**Init único + contentor sempre montado:**
- `gantt.init()` chamado uma vez (guarda `ganttInitialized.current`). Dados sincronizados via `gantt.clearAll()` + `gantt.parse()`.
- O container do Gantt é **sempre renderizado** (hidden via `display: none` quando inactivo) — nunca desmontar o contentor DHTMLX.
- Spinner de loading usa `if (loading && isFirstLoad.current)` — nas recargas subsequentes (`loadAll()`), o container mantém-se montado.

**`gantt.clearAll()` remove todos os markers** — o marcador "Hoje" deve ser re-adicionado via `gantt.addMarker()` **dentro de `parseGanttData()`, após `clearAll()`**. Nunca adicionar markers apenas no bloco de init.

**Stale closures em `gantt.attachEvent`:**
Handlers registados no init não têm acesso ao React state actualizado. Usar refs sincronizados:
```typescript
const tasksRef = useRef(tasks);
useEffect(() => { tasksRef.current = tasks; }, [tasks]);
// dentro do attachEvent: usar tasksRef.current
```
O mesmo padrão aplica-se a `linksRef`, `showToastRef`, `nonWorkingDaysRef`, `openCreateTaskRef`, etc.

**Layout:** 2 painéis — Tarefas (grid + timeline) + Recursos (resourceGrid + resourceTimeline).

**Resource nodes (`GanttResourceNode`):**
- `GanttResourceNode` é a fonte de verdade para a árvore de recursos — IDs auto-increment, sem colisões.
- `syncResourceNodes(projectId)` reconcilia a tabela com equipas + membros + externos a cada carregamento da página.
- `owner_id` em tarefas são IDs numéricos de `GanttResourceNode` como strings (ex: `["42", "43"]`). Sem prefixos.
- Migração de formatos legacy (`"5"`, `"u_5"`, `"r_3"`) feita automaticamente pelo backend no `syncResourceNodes`.
- Todos os recursos (internos + externos) são agrupados pelo tipo funcional — não existe grupo "Externos" separado.
- Resource grid: 3 colunas — Nome (tree), Horas/dia, Carga.

---

## 12. Modelo de Dados — Planeamento

**Modelos Prisma:** `GanttTask`, `GanttLink`, `GanttResource`, `GanttAssignment`, `GanttBaseline`.

**Formato de datas Gantt:** `"DD-MM-YYYY HH:mm"` (UTC) — funções `parseGanttDate` / `formatGanttDate` em `planning.service.ts`.

**Regras de serialização:**
- `GET /api/projects/:id/planning` devolve `{ data: GanttTask[], links: GanttLink[], resources, nonWorkingDays }`.
- `parent: 0` em `GanttTask` = tarefa raiz (sem pai) → `parentId: null` na BD.
- `type: "milestone"` exige `duration: 0` — validação no service.
- Ciclos em links detectados por BFS antes da inserção.
- Delete de tarefa faz cascade recursivo explícito nos filhos (além do cascade da BD).
- Todos os endpoints de planeamento usam `PUT` (não `PATCH`) — convenção DHTMLX.
- `ownerIds` em `GanttTask` são sempre `String[]` de IDs de `GanttResource`.
- `GanttResource` é scopado por `projectId` — isolamento multi-tenant.

**Separação de módulos NestJS:**
- `PlanningController` (`/projects/:id/planning/*`) — CRUD tarefas, links, recursos, horas. Acessível a todos os utilizadores JWT, independentemente da feature flag.
- `GanttController` (`/projects/:id/planning/gantt`) — apenas `GET`, protegido por `@RequireFeature('gantt_view')` + `FeatureFlagGuard`.

**Recursos externos (`GanttResource` sem `userId`):**
- `userTypeId` obrigatório na criação (`CreateResourceDto`); optional no update.
- `hoursPerDay` directo do `GanttResource`; internos usam `ProjectMemberHours`.
- `serializeResource()` — helper privado em `PlanningService`.

---

## 13. Integração com Feriados

`GET /projects/:id/planning` retorna `nonWorkingDays: string[]` (formato `"YYYY-MM-DD"`, UTC midnight).

**Em `PlanningPage.tsx`:**
- `nonWorkingDaysRef` (useRef) actualizado em `loadAll()` para evitar stale closures nos templates DHTMLX.
- `gantt.setWorkTime({ date, hours: false })` chamado em `parseGanttData()` após `clearAll()` para cada data de feriado.
- Template `timeline_cell_class`: holiday check feito **primeiro** (sem guarda `!isWeekend`), garantindo que feriados a fim-de-semana são pintados a âmbar e não a cinzento.
- `toLocalDateStr(date)` usa getters locais (não UTC) para consistência com o fuso horário do browser.

**CSS:**
- `.holiday` — células âmbar com linhas diagonais (`rgba(255,154,19,...)`).
- `.weekend` — células cinzentas com linhas diagonais.
- **Prioridade:** `.holiday` sobrepõe-se sempre a `.weekend`.

---

## 14. Feature Flag `gantt_view`

- Controla **apenas a UI** — visibilidade da tab Gantt e renderização do container DHTMLX.
- Os endpoints `/projects/:id/planning/*` **não são bloqueados** — a aba "Planeamento" (CRUD) funciona para todos os utilizadores.
- `PLATFORM_ADMIN` vê sempre a tab Gantt independentemente da flag.
- Seed cria a flag `gantt_view` e associa-a ao plano Básico como `enabled: true`.
- Frontend usa `useFeatureFlag('gantt_view')` com cache por sessão.

---

## 15. Sidebar — Nested Menu de Configurações

Classes Zynix obrigatórias para menus aninhados na sidebar (`AppLayout.tsx`):

```tsx
<li className="slide has-sub">
  <a href="javascript:void(0);" className="side-menu__item">
    {/* ícone SVG */}
    <span className="side-menu__label">Configurações</span>
    <i className="ri-arrow-right-s-line side-menu__angle" />
  </a>
  <ul className="slide-menu child1">
    <li className="slide side-menu__label1"><a href="javascript:void(0);">Configurações</a></li>
    <li className="slide has-sub">
      <a href="javascript:void(0);" className="side-menu__item">
        Componentes<i className="ri-arrow-right-s-line side-menu__angle" />
      </a>
      <ul className="slide-menu child2">
        <li className="slide">
          <NavLink to="/settings/gantt"
            className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
            Gantt
          </NavLink>
        </li>
      </ul>
    </li>
  </ul>
</li>
```

Classes: `slide has-sub`, `slide-menu child1`, `slide-menu child2`, `side-menu__label1`, `ri-arrow-right-s-line side-menu__angle`.

---

## 16. `endDateMode` — Modo de Data de Fim e Recalculação em Bulk

### Modos disponíveis

| Modo | Cálculo de `endDate` | Exemplo (início 02/03, dur. 1d) |
|------|---------------------|---------------------------------|
| `exclusive` (padrão DHTMLX) | `startDate + duration × 86400s` | `endDate = 03/03` |
| `inclusive` | `startDate + Math.max(0, duration − 1) × 86400s` | `endDate = 02/03` |

### Onde é configurado

- **Scope PROJECT** (offcanvas ⚙️ do Gantt em `PlanningPage`) → altera apenas o projecto actual e dispara recalculação em bulk.
- **Scope GLOBAL/USER** (`GanttSettingsPage`) → define o valor predefinido para utilizadores/projectos sem override; **não dispara recalculação retroactiva**.

### Regras de recalculação ao mudar `endDateMode`

1. Ao alterar `endDateMode` no offcanvas PROJECT, o utilizador recebe um SweetAlert de confirmação (padrão "Confirm Alert" do template Zynix) **antes** de qualquer alteração.
2. Se **cancelado**: nenhuma alteração é efectuada (nem config nem BD).
3. Se **confirmado** — fluxo sequencial em `handleDefaultsChange` (async):
   - `updateProjectConfig(...)` → persiste nova config no nível PROJECT.
   - `POST /projects/:id/planning/tasks/recalculate-end-dates` → recalcula e persiste `endDate` de **todas** as tarefas do projecto na BD.
   - Toast: `"Modo actualizado. X tarefa(s) actualizadas."`.
   - `loadAll()` → recarrega tarefas e re-renderiza o Gantt.
4. Se houver erro ao guardar a config: reverter `endDateModeRef.current` para o valor anterior; não chamar o endpoint de recalculação.

### Endpoint bulk

```
POST /api/projects/:projectId/planning/tasks/recalculate-end-dates
```

- **Auth:** JWT
- **Body:** `{ "endDateMode": "inclusive" | "exclusive" }`
- **Response:** `{ "affected": number }`
- **Implementação:** `PlanningService.recalculateEndDates()` → `prisma.$transaction([...tasks.map(update)])`
- **Ordem no controller:** declarado **antes** de `@Post('tasks')` para evitar que NestJS interprete `'recalculate-end-dates'` como um UUID de tarefa.

### SweetAlert2 — padrão Zynix "Confirm Alert"

```typescript
const result = await Swal.fire({
  title: 'Alterar modo de data de fim?',
  html: '<p>...</p>',
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#735DFF',  // Zynix primary
  cancelButtonColor: '#d33',
  confirmButtonText: 'Sim, actualizar datas',
  cancelButtonText: 'Cancelar',
});
if (result.isConfirmed) { /* ... */ }
```

`Swal` declarado globalmente em `PlanningPage.tsx`:
```typescript
declare const Swal: {
  fire(opts: Record<string, unknown>): Promise<{ isConfirmed: boolean }>;
};
```

### Nota para GanttSettingsPage (GLOBAL/USER scope)

A UI exibe um aviso informativo explicando que a alteração a estes níveis não recalcula retroactivamente as datas existentes. Para actualizar um projecto específico, o utilizador deve alterar o modo a partir do ⚙️ do Gantt desse projecto.
