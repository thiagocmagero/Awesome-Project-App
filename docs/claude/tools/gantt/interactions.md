# Claude: carregar para tarefas de eventos e interacções Gantt

## Eventos DHTMLX principais

```typescript
// Drag & drop (move datas)
gantt.attachEvent('onAfterTaskMove', async (id, mode, task) => {
  await updateTask(id, { startDate: task.start_date, duration: task.duration });
});

// Resize / progresso — handler MODE-AWARE.
gantt.attachEvent('onAfterTaskDrag', async (id, mode, e) => {
  // FONTE DE VERDADE em mode='move' = backend (`tasksRef`). NÃO usar
  // gantt.getTask().duration: o widget DHTMLX recompute duration consoante
  // a sua `duration_unit` global (bug "24h → 96 → 384" Maio 2026 em projectos
  // com timezone). Em mode='resize' a duration mudou genuinamente — ler do
  // widget e converter para a unidade da task se ≠ `gantt.config.duration_unit`.
  // Em mode='progress' enviar APENAS `progress`, nada mais.
  if (mode === 'progress') {
    return updateTask(id, { progress: gantt.getTask(id).progress });
  }
  const fromBackend = tasksRef.current.find((t) => t.id === id);
  const duration = mode === 'move' && fromBackend
    ? fromBackend.duration               // canónico
    : convertWidgetDurationToTaskUnit(  // resize: converter via workHoursRef.current
        gantt.getTask(id), fromBackend?.durationUnit, gantt, workHoursRef.current
      );
  await updateTask(id, { startDate: gantt.getTask(id).start_date, duration });
});

// `duration` enviada nestes eventos é em **dias úteis** (work_time-aligned)
// para tasks DAY, ou **horas úteis** para tasks HOUR. Backend recebe e calcula
// endDate via addBusinessDaysInclusive (DAY) ou addBusinessHoursInclusive
// (HOUR, tz-aware via project.timezone). Ver
// @docs/claude/tools/gantt/data-model.md para semântica completa
// (`endDateMode` inclusive/exclusive em DAY; wire format tz-aware em HOUR).

// Criação de link por drag
gantt.attachEvent('onAfterLinkAdd', async (id, link) => {
  const created = await createLink({ sourceId: link.source, targetId: link.target, type: link.type });
  gantt.changeLinkId(id, created.publicId); // troca ID temporário pelo publicId real
});

// Eliminação de link
gantt.attachEvent('onAfterLinkDelete', async (id, link) => {
  await deleteLink(link.id); // link.id já é o publicId (trocado via changeLinkId)
});

// Double-click → modal React (lightbox desactivado)
gantt.attachEvent('onTaskDblClick', (id) => {
  openEditModal(id);
  return false; // return false cancela lightbox nativo
});
```

## Stale closures — padrão obrigatório

Em `attachEvent`, callbacks capturam closure estático. Usar `useRef` para **todos** os valores que mudam:

```typescript
const showToastRef = useRef(showToast);
useEffect(() => { showToastRef.current = showToast; }, [showToast]);

const tokenRef = useRef(token);
useEffect(() => { tokenRef.current = token; }, [token]);

// Dentro do attachEvent — correcto:
showToastRef.current('danger', 'Erro ao guardar.');
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${tokenRef.current}` }
});
```

> **Nunca** usar variáveis de estado ou props directamente dentro de `attachEvent` — são capturadas no momento da criação do handler e ficam stale.

## Lightbox — desactivado

```typescript
gantt.attachEvent('onBeforeLightbox', () => false); // cancela lightbox nativo sempre
```

Double-click → `gantt.getTask(id)` para obter dados actuais → abre modal React.

## Validações no frontend (antes de criar link)

```typescript
gantt.attachEvent('onBeforeLinkAdd', (id, link) => {
  if (link.source === link.target) return false; // auto-link
  if (gantt.isCircularLink(link)) return false;  // ciclo
  return true;
});
```

## Sincronização de IDs (temporário → publicId)

```typescript
// Após criar tarefa no backend:
gantt.changeTaskId(tempId, created.publicId);

// Após criar link no backend:
gantt.changeLinkId(tempId, created.publicId);
```

Os `publicId` passam a ser os IDs definitivos usados em todos os eventos subsequentes.

## Conversão de datas

```typescript
// Gantt → ISO (para API)
task.start_date.toISOString()

// ISO → formato Gantt (ao carregar dados)
gantt.date.str_to_date('%Y-%m-%d')(dateStr)
```

## Inicialização — singleton

```typescript
// Apenas uma vez por página — nunca reinicializar
if (!ganttInitialized.current) {
  gantt.init(containerRef.current);
  ganttInitialized.current = true;
}
```

## Permissões — intercepts onBefore* obrigatórios

Toda a acção que persiste no backend e tem `@RequireProjectPermission` deve ter
um intercept correspondente no Gantt para cancelar a mutação visual quando o
utilizador não tem permissão. Sem isto, a barra mexe e depois reverte por causa
do 403 — má UX.

`canDoRef` é um `useRef` actualizado em cada render (canDo muda referência a cada
render — capturá-lo directamente daria stale closure).

```typescript
// onBeforeTaskDrag — bloqueia drag de barras (TASK_EDIT)
gantt.attachEvent('onBeforeTaskDrag', () => {
  if (!canDoRef.current('TASK_EDIT')) {
    showToastRef.current('warning', tRef.current('common:errors.forbidden'));
    return false;
  }
  return true;
});

// onBeforeLinkAdd / onBeforeLinkDelete — LINK_MANAGE
gantt.attachEvent('onBeforeLinkAdd',    () => canDoRef.current('LINK_MANAGE'));
gantt.attachEvent('onBeforeLinkDelete', () => canDoRef.current('LINK_MANAGE'));

// onTaskCreated — TASK_CREATE (já redireccionado para modal React)
gantt.attachEvent('onTaskCreated', () => {
  if (!canDoRef.current('TASK_CREATE')) {
    showToastRef.current('warning', tRef.current('common:errors.forbidden'));
    return false;
  }
  openCreateTaskRef.current(...);
  return false; // sempre cancela add nativo, modal React encarrega
});
```

Toast usa `t('common:errors.forbidden')` — chave existe no namespace `common`,
acedida via prefixo cross-namespace do i18next.

## Granularidade do widget — toggle Day | Hour

Desde Maio 2026, o widget suporta dois modos de visualização:

```typescript
// frontend/src/features/planning/ganttHelpers.ts
import { setGanttGranularity, applyDayScales, applyHourScales } from './ganttHelpers';

setGanttGranularity('hour');  // ou 'day'
```

Implementação:
- **Day**: `gantt.config.duration_unit = 'day'`, `duration_step = 1`,
  scales `[week, day]` (apply via `applyDayScales`).
- **Hour**: `gantt.config.duration_unit = 'hour'`, `duration_step = 0.25`
  (snap 15min), scales `[day, hour]` com formato `'%H:%i'`
  (apply via `applyHourScales`).

Ao alternar, `setGanttGranularity` faz **recompute de durations** porque
`task.duration` depende da unidade actual. `start_date` e `end_date` são a
verdade canónica (per docs DHTMLX) — não convertem; apenas `duration` é
re-derivado via `gantt.calculateDuration({ start, end, task })`.

```typescript
gantt.eachTask((t) => {
  t.duration = gantt.calculateDuration({
    start_date: t.start_date,
    end_date:   t.end_date,
    task: t,
  });
});
gantt.render();
```

### Init order — viewUnit persistido

[`useGanttInit.ts`](frontend/src/features/planning/useGanttInit.ts) lê
`ganttConfig.defaults?.viewUnit` (default `'day'`) **antes** de chamar
`gantt.init()`:

```typescript
const initialViewUnit = ganttConfig.defaults?.viewUnit ?? 'day';
if (initialViewUnit === 'hour') {
  gantt.config.duration_unit = 'hour';
  gantt.config.duration_step = 0.25;
  applyHourScales();
} else {
  applyDayScales();
}
gantt.init(container);
```

Persistência: o handler `handleChangeGanttViewUnit` em `PlanningPage.tsx`
chama `setGanttGranularity(mode)` + `updateProjectConfig({ defaults: { viewUnit: mode } })`
(fire-and-forget, com rollback do state local em caso de falha).

### Co-existência DAY ↔ HOUR no widget

Tasks com `task.durationUnit === 'DAY'` e tasks `'HOUR'` **co-existem** em
qualquer modo do widget. O toggle só muda escalas/snap; **não converte**
dados nem altera `task.durationUnit` no DB.

- Em modo "day", uma task HOUR de 14h–16h aparece como uma barra curta
  dentro do dia (visualmente quase invisível).
- Em modo "hour", uma task DAY de 5 dias aparece como barra grande que
  ocupa 5 colunas-dia (cada uma com 24 sub-colunas-hora).

`parseGanttData` ramifica a conversão `inclusive → +1 day` apenas para
tasks DAY (ver `docs/claude/tools/gantt/data-model.md`).

### Project.workHours em `setWorkTime`

[`ganttHelpers.ts:parseGanttData`](frontend/src/features/planning/ganttHelpers.ts)
aplica a janela útil do projecto via `gantt.setWorkTime({ hours: [start, end] })`
antes de adicionar weekends e holidays. Sem isto, em modo HOUR o widget
considera 24h como work time e ignora a noite.

```typescript
const wh = workHours ?? { start: 9, end: 18 };
gantt.setWorkTime({ hours: [wh.start, wh.end] });
gantt.setWorkTime({ day: [0, 6], hours: false }); // weekends
nonWorkingDaysRef.current.forEach((ds) => {
  gantt.setWorkTime({ date: new Date(ds + 'T00:00:00'), hours: false });
});
```

`workHoursRef` é actualizado em PlanningPage via effect quando
`project.workHours` muda — sem stale closure.

## Anti-padrões

- ❌ Estado React directamente em `attachEvent` — usar `useRef`
- ❌ `return true` em `onBeforeLightbox` — lightbox deve estar sempre desactivado
- ❌ Não trocar ID temporário após criar no backend — `changeTaskId`/`changeLinkId` obrigatório
- ❌ `gantt.init()` mais do que uma vez — singleton por página
- ❌ Acção que persiste sem intercept `onBefore*` — utilizador sem permissão vê
  efeito visual e 403 a seguir
- ❌ `canDo` capturado por closure em `attachEvent` — stale; usar `canDoRef.current('ACTION')`
- ❌ Mudar `gantt.config.duration_unit` directamente sem chamar
  `setGanttGranularity` — sem recompute de `task.duration`, as barras
  colapsam visualmente (5 dias passam a 5 horas).
- ❌ Esquecer `gantt.setWorkTime({ hours: [...] })` em modo HOUR — o widget
  considera 24h úteis e o display da noite fica incorrecto.
- ❌ Conversão `+1 day` em `parseGanttData` para tasks HOUR — `endDate` é
  hora exacta canónica.

# Relacionados: @docs/claude/tools/gantt/overview.md @docs/claude/tools/gantt/rendering.md @docs/claude/frontend.md
