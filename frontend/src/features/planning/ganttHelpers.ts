import type { MutableRefObject } from 'react';
import { apiFetch } from '../../lib/api';
import { buildCellCSS } from '../../lib/ganttPatterns';
import { formatDate } from '../../lib/dateFormatting';
import type {
  GanttTask, GanttLink, ResourceNode, GanttConfigData, GanttConfigColors,
  ShowToastFn,
} from './types';
import { dateToGanttStr } from './ganttDateUtils';
import {
  clampMoveStart,
  clampResizeLeftStart,
  clampResizeRightEnd,
  calendarHoursBetween,
} from '../../lib/workHours';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: any, opts?: any) => string;

// ─── Tree helpers ─────────────────────────────────────────────────────────────

export function flattenTree(tasks: GanttTask[]): Array<GanttTask & { depth: number }> {
  const byParent = new Map<number, GanttTask[]>();
  for (const task of tasks) {
    const p = task.parent ?? 0;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(task);
  }
  const result: Array<GanttTask & { depth: number }> = [];
  function walk(parentId: number, depth: number) {
    for (const task of byParent.get(parentId) ?? []) {
      result.push({ ...task, depth });
      walk(task.id, depth + 1);
    }
  }
  walk(0, 0);
  const inTree = new Set(result.map((task) => task.id));
  for (const task of tasks) {
    if (!inTree.has(task.id)) result.push({ ...task, depth: 0 });
  }
  return result;
}

/** Initials from name */
export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

// ─── Gantt colours ────────────────────────────────────────────────────────────

/**
 * Injeta/actualiza um <style id="gantt-custom-colors"> no <head> com as cores
 * personalizadas do utilizador/projecto para o DHTMLX Gantt.
 */
export function applyGanttColors(colors: GanttConfigColors | undefined): void {
  let el = document.getElementById('gantt-custom-colors') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'gantt-custom-colors';
  }
  // Always re-append to <head> so this element stays LAST — ensures our !important rules
  // override the hardcoded .weekend / .holiday block injected during Gantt init.
  document.head.appendChild(el);

  if (!colors || Object.keys(colors).length === 0) { el.textContent = ''; return; }

  const rules: string[] = [];
  if (colors.taskBar) {
    rules.push(`.gantt_task_line:not(.gantt_project):not(.gantt_milestone) { background-color: ${colors.taskBar}; border-color: ${colors.taskBar}; }`);
    rules.push(`.gantt_task_line:not(.gantt_project):not(.gantt_milestone) .gantt_task_progress { background: ${colors.taskBar}; filter: brightness(0.82); }`);
  }
  if (colors.taskBarProject)
    rules.push(`.gantt_task_line.gantt_project { background-color: ${colors.taskBarProject}; border-color: ${colors.taskBarProject}; }`);
  if (colors.milestone)
    rules.push(`.gantt_task_line.gantt_milestone { background-color: ${colors.milestone}; border-color: ${colors.milestone}; }`);
  if (colors.links) {
    rules.push(`.gantt_task_link .gantt_line_wrapper div { background-color: ${colors.links}; }`);
    rules.push(`.gantt_task_link .gantt_link_arrow { border-color: ${colors.links} !important; }`);
  }
  if (colors.todayMarker)
    rules.push(`.gantt_today_marker { background-color: ${colors.todayMarker}; }`);

  if (colors.weekendColor || colors.weekendPattern) {
    const hex     = (colors.weekendColor  ?? '#9aa5b4') as string;
    const pattern = (colors.weekendPattern ?? 'diagonal') as import('./types').CellPattern;
    rules.push(buildCellCSS('.weekend', hex, pattern));
  }
  if (colors.holidayColor || colors.holidayPattern) {
    const hex     = (colors.holidayColor  ?? '#ff9a13') as string;
    const pattern = (colors.holidayPattern ?? 'diagonal') as import('./types').CellPattern;
    rules.push(buildCellCSS('.holiday', hex, pattern));
  }

  el.textContent = rules.join('\n');
}

// ─── Gantt column builder ────────────────────────────────────────────────────

export function buildColumns(
  vis: GanttConfigData['columns'],
  tRef: MutableRefObject<TFn>,
  endDateModeRef: MutableRefObject<'inclusive' | 'exclusive'>,
  dateFormatRef: MutableRefObject<string>,
  tasksRef?: MutableRefObject<GanttTask[]>,
): object[] {
  const ownerTpl = (task: Record<string, unknown>) => {
    if (task.type === gantt.config.types.project) return '';
    const store = gantt.getDatastore('resource');
    const owners = task[gantt.config.resource_property] as string[] | undefined;
    if (!owners || !owners.length) return '<span class="text-muted fs-12">—</span>';
    if (owners.length === 1) { const r = store.getItem(owners[0]); return r ? r.text : ''; }
    return owners.map((oid: string) => {
      const r = store.getItem(oid);
      return r ? `<div class='owner-label' title='${r.text}'>${r.text.substring(0, 1)}</div>` : '';
    }).join('');
  };
  const cols: object[] = [{ name: 'text', tree: true, width: 220, resize: true, label: tRef.current('table.task') }];
  if (vis.priority) cols.unshift({
    name: 'priority',
    label: '',
    width: 28,
    min_width: 28,
    align: 'center',
    resize: false,
    template: (task: Record<string, unknown>) => {
      const p = task.priority as number | undefined;
      const color =
        p === 0 ? '#dc3545' :
        p === 1 ? '#fd7e14' :
        p === 2 ? '#ffc107' :
        p === 3 ? '#198754' :
        '#dee2e6';
      const title =
        p === 0 ? tRef.current('task.priority.critical') :
        p === 1 ? tRef.current('task.priority.high') :
        p === 2 ? tRef.current('task.priority.medium') :
        p === 3 ? tRef.current('task.priority.low') :
        tRef.current('task.priority.none');
      return `<span title="${title}" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>`;
    },
  });
  if (vis.start_date) cols.push({
    name: 'start_date', align: 'center', width: 100, resize: true, label: tRef.current('gantt:gantt.col.start_date'),
    template: (task: Record<string, unknown>) => {
      const sd = task.start_date;
      if (!sd) return '—';
      const d = sd instanceof Date ? sd : new Date(sd as string);
      return formatDate(d, dateFormatRef.current);
    },
  });
  if (vis.end_date)   cols.push({
    name: 'end_date', align: 'center', width: 100, resize: true, label: tRef.current('gantt:gantt.col.end_date'),
    template: (task: Record<string, unknown>) => {
      const ed = task.end_date;
      if (!ed) return '—';
      // DHTMLX armazena sempre datas exclusivas internamente — em modo
      // inclusivo subtrair 1 dia para mostrar o último dia real ao utilizador.
      const d = ed instanceof Date ? ed : new Date(ed as string);
      const disp = endDateModeRef.current === 'inclusive' ? new Date(d.getTime() - 86400000) : d;
      return formatDate(disp, dateFormatRef.current);
    },
  });
  if (vis.owner)      cols.push({ name: 'owner', align: 'center', width: 80, resize: true, label: tRef.current('gantt:gantt.col.owner'), template: ownerTpl });
  if (vis.duration)   cols.push({
    name: 'duration', width: 70, align: 'center', resize: true,
    label: tRef.current('gantt:gantt.col.duration'),
    template: (task: Record<string, unknown>) => {
      // FONTE DE VERDADE = backend (`tasksRef`). Em widget mode='hour', DHTMLX
      // recompute task.duration via gantt.calculateDuration ignorando o
      // task.durationUnit per-task — o display fica errado (e.g., task DAY=1
      // aparece como 36 horas calendar work-time-aware). Mostrar o valor
      // canónico do React state com sufixo da unidade real da task.
      const fromBackend = tasksRef?.current.find((t) => t.id === task.id);
      const duration = fromBackend ? fromBackend.duration : (task.duration as number);
      const unit = (fromBackend?.durationUnit ?? task.durationUnit) as 'DAY' | 'HOUR' | undefined;
      const suffix = unit === 'HOUR' ? 'h' : '';
      return String(duration) + suffix;
    },
  });
  cols.push({ name: 'add', width: 44 });
  return cols;
}

// ─── Gantt layout ────────────────────────────────────────────────────────────

export function buildGanttLayout(
  withResources: boolean,
  resourceConfig: { columns: object[] },
): object {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [
    {
      cols: [
        { view: 'grid', group: 'grids', scrollY: 'scrollVer' },
        { resizer: true, width: 1 },
        { view: 'timeline', scrollX: 'scrollHor', scrollY: 'scrollVer' },
        { view: 'scrollbar', id: 'scrollVer', group: 'vertical' },
      ],
      gravity: 2,
    },
  ];
  if (withResources) {
    rows.push({ resizer: true, width: 1 });
    rows.push({
      config: resourceConfig,
      cols: [
        { view: 'resourceGrid', group: 'grids', width: 460, scrollY: 'resourceVScroll' },
        { resizer: true, width: 1 },
        { view: 'resourceTimeline', scrollX: 'scrollHor', scrollY: 'resourceVScroll' },
        { view: 'scrollbar', id: 'resourceVScroll', group: 'vertical' },
      ],
      gravity: 1,
    });
  }
  rows.push({ view: 'scrollbar', id: 'scrollHor' });
  return { css: 'gantt_container', rows };
}

// ─── Gantt data parse ─────────────────────────────────────────────────────────

export interface ParseGanttDataParams {
  tasks: GanttTask[];
  links: GanttLink[];
  resourceNodes: ResourceNode[];
  nonWorkingDaysRef: MutableRefObject<string[]>;
  endDateModeRef: MutableRefObject<'inclusive' | 'exclusive'>;
  tRef: MutableRefObject<TFn>;
  /** Janela útil do projecto (24h). null/undefined ⇒ default 09:00–18:00. */
  workHours?: { start: number; end: number } | null;
}

/** Converte string DHTMLX 'DD-MM-YYYY HH:mm' → Date local (null se inválida). */
function parseDhxDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = '00', min = '00'] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
}

export function parseGanttData({
  tasks, links, resourceNodes, nonWorkingDaysRef, endDateModeRef, tRef, workHours,
}: ParseGanttDataParams): void {
  if (typeof gantt === 'undefined') return;

  // Preservar scroll position — DHTMLX `clearAll()` + `parse()` repõe o
  // viewport à esquerda. Sem isto, qualquer edição (drag, resize, save de
  // task) faz o utilizador "saltar" para Abril–Maio quando estava em Junho.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevScroll: { x: number; y: number } | null =
    typeof (gantt as any).getScrollState === 'function'
      ? (gantt as any).getScrollState()
      : null;

  gantt.clearAll();

  // Re-adicionar marcador "Hoje" após clearAll() (clearAll remove markers)
  const dateToStr = gantt.date.date_to_str(gantt.config.task_date);
  const now = new Date();
  gantt.addMarker({
    start_date: now,
    css: 'today',
    text: tRef.current('gantt:gantt.today_marker'),
    title: tRef.current('gantt:gantt.today_marker') + ': ' + dateToStr(now),
  });

  // Só mostrar no resource grid os recursos que têm tarefas associadas
  const assignedNodeIds = new Set<number>();
  for (const task of tasks) {
    for (const oid of task.owner_id ?? []) {
      const nid = Number(oid);
      if (!isNaN(nid)) assignedNodeIds.add(nid);
    }
  }

  // Folhas com tarefas + os seus grupos-pai
  const activeLeaves = resourceNodes.filter((n) => !n.isGroup && assignedNodeIds.has(n.id));
  const activeGroupIds = new Set(activeLeaves.map((n) => n.parent));
  const activeGroups = resourceNodes.filter((n) => n.isGroup && activeGroupIds.has(n.id));

  const resourceData = [...activeGroups, ...activeLeaves].map((n) => ({
    id: n.id,
    text: n.text,
    parent: n.parent || null,
    isGroup: n.isGroup,
    hoursPerDay: n.hoursPerDay,
  }));

  const resourcesStore = gantt.getDatastore('resource');
  if (resourcesStore) resourcesStore.parse(resourceData);

  // Re-apply work time (clearAll doesn't reset DHTMLX calendar).
  // Janela útil per-project para tasks HOUR (ex.: 9..18). Default 9..18.
  const wh = workHours ?? { start: 9, end: 18 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (gantt as any).setWorkTime({ hours: [wh.start, wh.end] });
  gantt.setWorkTime({ day: [0, 6], hours: false });
  for (const ds of nonWorkingDaysRef.current) {
    gantt.setWorkTime({ date: new Date(ds + 'T00:00:00'), hours: false });
  }

  // Range derivado das tasks. Clamp absoluto [now-5y, now+10y] para tasks com
  // dates corrompidas (defensivo) — fora desse range são IGNORADAS no cálculo
  // (mas continuam a renderizar via smart_rendering se o user fizer scroll
  // até lá).
  //
  // Sem cap de span — `gantt.config.smart_rendering = true` (Maio 2026)
  // garante render só do viewport visível, mesmo com timelines de 10+ anos.
  // Cap artificial bloqueava o user de chegar ao fim de tasks longas
  // legítimas (ex.: programa de 3 anos não chega a 2029 se cap = 3y).
  const _d = new Date();
  const _now = _d.getTime();
  const MIN_ALLOWED = _now - 5  * 365 * 86400000;
  const MAX_ALLOWED = _now + 10 * 365 * 86400000;

  let minTaskDate = new Date(_d.getFullYear(), _d.getMonth() - 1, 1);
  let maxTaskDate = new Date(_d.getFullYear(), _d.getMonth() + 3, 1);
  for (const t of tasks) {
    const sd = parseDhxDate(t.start_date);
    const ed = t.end_date ? parseDhxDate(t.end_date) : sd;
    if (sd && sd.getTime() >= MIN_ALLOWED && sd.getTime() <= MAX_ALLOWED) {
      if (sd.getTime() < minTaskDate.getTime()) minTaskDate = sd;
    }
    if (ed && ed.getTime() >= MIN_ALLOWED && ed.getTime() <= MAX_ALLOWED) {
      if (ed.getTime() > maxTaskDate.getTime()) maxTaskDate = ed;
    }
  }
  // 1 mês de folga em cada lado para conforto visual
  gantt.config.start_date = new Date(
    minTaskDate.getFullYear(), minTaskDate.getMonth() - 1, 1,
  );
  gantt.config.end_date = new Date(
    maxTaskDate.getFullYear(), maxTaskDate.getMonth() + 2, 1,
  );

  // Deep-clone to prevent DHTMLX from mutating React state (it converts date strings to Date objects)
  // No modo inclusivo o backend devolve end_date = último dia real — converter para exclusivo (DHTMLX).
  // Tasks com `durationUnit === 'HOUR'` NÃO são afectadas: o end_date já é a hora exacta canónica,
  // não há "+1 dia" semântica. Ver docs/claude/tools/gantt/data-model.md.
  let tasksForGantt: GanttTask[] = tasks;
  if (endDateModeRef.current === 'inclusive') {
    tasksForGantt = tasks.map((t) => {
      if (!t.end_date) return t;
      if (t.durationUnit === 'HOUR') return t; // hora exacta — sem soma
      const [datePart, timePart = '00:00'] = t.end_date.split(' ');
      const [dd, mm, yyyy] = datePart.split('-');
      const d = new Date(`${yyyy}-${mm}-${dd}T${timePart}:00.000Z`);
      const excl = new Date(d.getTime() + 86400000);
      const eStr = `${String(excl.getUTCDate()).padStart(2,'0')}-${String(excl.getUTCMonth()+1).padStart(2,'0')}-${excl.getUTCFullYear()} ${String(excl.getUTCHours()).padStart(2,'0')}:${String(excl.getUTCMinutes()).padStart(2,'0')}`;
      return { ...t, end_date: eStr };
    });
  }

  gantt.parse(JSON.parse(JSON.stringify({ data: tasksForGantt, links })));

  // Re-render markers after clearAll + parse (clearAll destroys marker DOM)
  if (typeof gantt.renderMarkers === 'function') gantt.renderMarkers();

  // Restaurar scroll capturado antes do clearAll (ver topo da função). Tem
  // que ser feito após o parse, quando o conteúdo já existe — caso contrário
  // o scrollTo é ignorado.
  if (prevScroll && (prevScroll.x > 0 || prevScroll.y > 0)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = gantt as any;
    if (typeof g.scrollTo === 'function') {
      try { g.scrollTo(prevScroll.x, prevScroll.y); } catch { /* ignore */ }
    }
  }
}

// ─── Gantt event registration ─────────────────────────────────────────────────

export interface AttachGanttEventsParams {
  ganttEl: HTMLDivElement;
  projectId: string;
  token: string | null;
  api: string;
  endDateModeRef: MutableRefObject<'inclusive' | 'exclusive'>;
  linksRef: MutableRefObject<GanttLink[]>;
  /**
   * Tasks vindas do backend (estado React). É a FONTE DE VERDADE para edits
   * via TaskModal — em vez de ler `gantt.getTask()` (que tem `duration`
   * recomputado pelo widget conforme `duration_unit` global, causando drift
   * quando a unidade da task ≠ unidade do widget).
   */
  tasksRef: MutableRefObject<GanttTask[]>;
  showToastRef: MutableRefObject<ShowToastFn>;
  openCreateTaskRef: MutableRefObject<(parentId?: number) => void>;
  ganttSearchTextRef: MutableRefObject<string>;
  tRef: MutableRefObject<TFn>;
  // Permission gate — usado nos onBefore* para bloquear drag/link/create antes
  // do widget alterar o seu estado interno (alinhado com o padrão do Kanban).
  canDoRef: MutableRefObject<(action: string) => boolean>;
  /** Janela útil do projecto. Usada para converter widget↔task duration sem
   *  hardcoded `*9` (que assume workHours 9-18 default). */
  workHoursRef: MutableRefObject<{ start: number; end: number } | null>;
  setColumnMenuPos: (pos: { x: number; y: number } | null) => void;
  setTasks: (fn: (prev: GanttTask[]) => GanttTask[]) => void;
  setLinks: (fn: (prev: GanttLink[]) => GanttLink[]) => void;
  openEditTask: (task: GanttTask) => void;
  loadAll: () => Promise<void>;
}

/** Regista todos os gantt.attachEvent e o context menu listener.
 *  Retorna uma função de cleanup que os desregista. */
export function attachGanttEvents(params: AttachGanttEventsParams): () => void {
  const {
    ganttEl, projectId, token, api,
    endDateModeRef, linksRef, tasksRef, showToastRef, openCreateTaskRef,
    ganttSearchTextRef, tRef, canDoRef, workHoursRef, setColumnMenuPos,
    setTasks, setLinks, openEditTask, loadAll,
  } = params;

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  const evtIds: string[] = [];

  evtIds.push(gantt.attachEvent('onTaskDblClick', function (id: number) {
    // FONTE DE VERDADE = backend (`tasksRef`). NÃO usar `gantt.getTask(id)`
    // para popular o form: o widget DHTMLX recompute `duration` conforme
    // `duration_unit` global (ex.: task HOUR vista em modo DAY → duration
    // recomputed em dias → save grava valor errado → próximo save amplifica
    // o drift). Bug real reproduzido: 24h → 96 → 384 em saves consecutivos.
    // O DHTMLX pode entregar id como string ou number — normalizar.
    const numericId = typeof id === 'number' ? id : Number(id);
    const fromBackend = tasksRef.current.find((t) => t.id === numericId);
    if (fromBackend) {
      openEditTask(fromBackend);
      return false;
    }
    // Fallback: task acabada de criar pelo widget e ainda não sincronizada
    // com o backend. Lê do widget mas SOBRESCREVE `duration`/`durationUnit`
    // com defaults seguros — o user terá de ajustar no modal antes de salvar.
    const task = gantt.getTask(numericId);
    if (!task) return false;
    const mapped: GanttTask = {
      id: task.id as number,
      publicId: (task as Record<string, unknown>).publicId as string ?? '',
      text: task.text,
      type: task.type || 'task',
      start_date: task.start_date instanceof Date ? dateToGanttStr(task.start_date) : (task.start_date || ''),
      duration: 1, // safe default — não confiar no widget (recompute drift)
      durationUnit: 'DAY',
      progress: task.progress ?? 0,
      owner_id: task.owner_id ?? [],
      parent: task.parent ?? 0,
      priority: task.priority,
      constraint_type: task.constraint_type,
      constraint_date: task.constraint_date instanceof Date ? dateToGanttStr(task.constraint_date) : (task.constraint_date || undefined),
      boardColumn: (task as Record<string, unknown>).boardColumn as string ?? null,
      boardSwimlane: (task as Record<string, unknown>).boardSwimlane as string ?? null,
      boardPosition: (task as Record<string, unknown>).boardPosition as number ?? null,
    };
    openEditTask(mapped);
    return false;
  }));

  evtIds.push(gantt.attachEvent('onBeforeLightbox', function () { return false; }));

  // ── Permission gates (onBefore* — cancelam antes de DHTMLX mutar o store) ──
  // Defense-in-depth: o backend já valida 403, mas evitamos UX em que o widget
  // muda visualmente e depois reverte por causa do erro.
  evtIds.push(gantt.attachEvent('onBeforeTaskDrag', function (id: number | string) {
    if (!canDoRef.current('TASK_EDIT')) {
      showToastRef.current('warning', tRef.current('common:errors.forbidden'));
      return false;
    }
    // Bloqueia drag/resize quando o modo do widget (`duration_unit`) não
    // bate com o `durationUnit` da task. DHTMLX em modo 'day' faz snap em
    // dias inteiros, corrompendo sub-day HOUR tasks. Inverso também.
    // ID-coercion: DHTMLX pode passar id como string ou number — coercer
    // ambos lados para number antes de comparar.
    const numId = Number(id);
    const fromBackend = tasksRef.current.find((t) => Number(t.id) === numId);
    // Fallback para o widget se o backend ref ainda não tiver a task (race).
    const widgetTask = gantt.getTask(id);
    const widgetTaskUnitRaw = (widgetTask as Record<string, unknown> | undefined)?.durationUnit as 'DAY' | 'HOUR' | undefined;
    const taskUnit: 'DAY' | 'HOUR' =
      (fromBackend?.durationUnit as 'DAY' | 'HOUR' | undefined)
      ?? widgetTaskUnitRaw
      ?? 'DAY';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const widgetUnit = ((gantt as any).config?.duration_unit as string | undefined) ?? 'day';
    const widgetIsHour = widgetUnit === 'hour';
    const taskIsHour = taskUnit === 'HOUR';
    if (widgetIsHour !== taskIsHour) {
      showToastRef.current(
        'warning',
        tRef.current(taskIsHour
          ? 'task.error_widget_must_be_hour'
          : 'task.error_widget_must_be_day'),
      );
      return false;
    }
    return true;
  }));

  evtIds.push(gantt.attachEvent('onBeforeLinkAdd', function () {
    if (!canDoRef.current('LINK_MANAGE')) {
      showToastRef.current('warning', tRef.current('common:errors.forbidden'));
      return false;
    }
    return true;
  }));

  evtIds.push(gantt.attachEvent('onBeforeLinkDelete', function () {
    if (!canDoRef.current('LINK_MANAGE')) {
      showToastRef.current('warning', tRef.current('common:errors.forbidden'));
      return false;
    }
    return true;
  }));

  evtIds.push(gantt.attachEvent('onTaskCreated', function (task: Record<string, unknown>) {
    if (!canDoRef.current('TASK_CREATE')) {
      showToastRef.current('warning', tRef.current('common:errors.forbidden'));
      return false;
    }
    openCreateTaskRef.current(Number(task.parent) || 0);
    return false; // impede DHTMLX de adicionar tarefa temporária ao store
  }));

  evtIds.push(gantt.attachEvent('onAfterTaskDrag', function (
    numericId: number,
    mode: 'move' | 'resize' | 'progress',
    _e?: Event,
  ) {
    const widgetTask = gantt.getTask(numericId);
    if (!widgetTask) return;
    const publicId = (widgetTask as Record<string, unknown>).publicId as string;
    if (!publicId) return;

    // FONTE DE VERDADE = backend (`tasksRef`). O widget DHTMLX recompute
    // `task.duration` consoante a sua `duration_unit` global (ex.: task HOUR
    // vista em modo DAY → duration recomputed em dias). Em mode='move' o
    // duration NÃO mudou semanticamente — usar valor canónico do backend
    // evita o bug "24h → 96 → 384" em projectos com timezone (Maio 2026).
    // ID-coercion: DHTMLX pode passar id como string ou number.
    const numId = Number(numericId);
    const fromBackend = tasksRef.current.find((t) => Number(t.id) === numId);
    // BACKEND-FIRST precedence. DHTMLX pode mutar `widgetTask.durationUnit`
    // (ou substituí-lo pelo `gantt.config.duration_unit` global) durante drag
    // em modo cruzado. Confiar no backend evita a "conversão silenciosa" de
    // tasks HOUR em DAY que resultava em `addBusinessDaysInclusive(start, 2)`
    // → +2 dias em vez de +2 horas.
    const backendUnit = fromBackend?.durationUnit as 'DAY' | 'HOUR' | undefined;
    const widgetUnitRaw = (widgetTask as Record<string, unknown>).durationUnit as 'DAY' | 'HOUR' | undefined;
    const taskUnit: 'DAY' | 'HOUR' = backendUnit ?? widgetUnitRaw ?? 'DAY';

    // PROGRESS — não envia start_date nem duration. Evita propagação de drift
    // para campos não tocados pelo user.
    if (mode === 'progress') {
      const progressBody = { progress: widgetTask.progress ?? 0 };
      apiFetch(`${api}/projects/${projectId}/planning/tasks/${publicId}`, {
        method: 'PUT', headers: h(), body: JSON.stringify(progressBody),
      }).then(async (r) => {
        if (r.ok) {
          const saved = await r.json();
          const safe = JSON.parse(JSON.stringify(saved));
          setTasks((prev) => prev.map((tk) => tk.id === safe.id ? safe : tk));
        } else {
          const data = await r.json().catch(() => ({}));
          const code = (data.error_code as string | undefined)
            ?? (Array.isArray(data.message) ? data.message[0] : data.message);
          showToastRef.current('danger', code || tRef.current('task.error_save'));
          loadAll().catch(() => {});
        }
      });
      return true;
    }

    const wh = workHoursRef.current ?? { start: 9, end: 18 };

    // Strings wire format do widget (LOCAL → "DD-MM-YYYY HH:mm").
    const widgetStartStrRaw = widgetTask.start_date instanceof Date
      ? dateToGanttStr(widgetTask.start_date)
      : (widgetTask.start_date as string);
    const widgetEndStrRaw = widgetTask.end_date instanceof Date
      ? dateToGanttStr(widgetTask.end_date)
      : (widgetTask.end_date as string);

    const isResize = mode === 'resize';
    const backendStart = fromBackend?.start_date;
    const backendEnd = fromBackend?.end_date;

    // Detecta lado do resize comparando widget vs backend.
    // LEFT: start mudou, end igual. RIGHT: end mudou, start igual.
    let resizeSide: 'left' | 'right' | null = null;
    if (isResize) {
      const startDiff = backendStart && widgetStartStrRaw !== backendStart;
      const endDiff = backendEnd && widgetEndStrRaw !== backendEnd;
      if (startDiff && !endDiff) resizeSide = 'left';
      else if (!startDiff && endDiff) resizeSide = 'right';
      else if (startDiff && endDiff) resizeSide = 'right'; // fallback
      else resizeSide = null; // nada mudou
    }

    // ── HOUR — caminhos específicos com clamp + info toast ──────────────────
    if (taskUnit === 'HOUR' && fromBackend) {
      const body: Record<string, unknown> = { durationUnit: 'HOUR' };
      let didClamp = false;
      let willMutate = false;

      if (mode === 'move') {
        // Drag inteiro: preservar duration canónica, clamp do start.
        const canonicalDur = fromBackend.duration;
        if (widgetStartStrRaw === backendStart) {
          // sem movimento → skip
          return true;
        }
        const { start: clampedStart, clamped } = clampMoveStart(widgetStartStrRaw, canonicalDur, wh);
        didClamp = clamped;
        body.start_date = clampedStart;
        body.duration = canonicalDur;
        body.endDateMode = endDateModeRef.current;
        willMutate = true;
        if (clamped) {
          // Ajustar widget visualmente para reflectir o clamp antes da resposta do server.
          try {
            const t = gantt.getTask(numericId);
            if (t) {
              t.start_date = parseDhxDate(clampedStart) ?? t.start_date;
              const newEndMs = (t.start_date as Date).getTime() + canonicalDur * 3_600_000;
              t.end_date = new Date(newEndMs);
              gantt.updateTask(numericId);
            }
          } catch { /* ignore */ }
        }
      } else if (resizeSide === 'right') {
        // Right-resize: keep start, clamp end, recompute duration.
        if (!backendStart) return true;
        const { end: clampedEnd, clamped } = clampResizeRightEnd(backendStart, widgetEndStrRaw, wh);
        didClamp = clamped;
        const newDurRaw = calendarHoursBetween(backendStart, clampedEnd);
        const newDur = Number.isFinite(newDurRaw)
          ? Math.max(0.25, Math.round(newDurRaw * 4) / 4)
          : fromBackend.duration;
        if (newDur === fromBackend.duration && !clamped) return true;
        body.duration = newDur;
        body.endDateMode = endDateModeRef.current;
        willMutate = true;
        if (clamped) {
          try {
            const t = gantt.getTask(numericId);
            if (t) {
              t.end_date = parseDhxDate(clampedEnd) ?? t.end_date;
              gantt.updateTask(numericId);
            }
          } catch { /* ignore */ }
        }
      } else if (resizeSide === 'left') {
        // Left-resize: keep end, clamp start, recompute duration.
        if (!backendEnd) return true;
        const { start: clampedStart, clamped } = clampResizeLeftStart(widgetStartStrRaw, backendEnd, wh);
        didClamp = clamped;
        const newDurRaw = calendarHoursBetween(clampedStart, backendEnd);
        const newDur = Number.isFinite(newDurRaw)
          ? Math.max(0.25, Math.round(newDurRaw * 4) / 4)
          : fromBackend.duration;
        if (clampedStart === backendStart && newDur === fromBackend.duration) return true;
        body.start_date = clampedStart;
        body.duration = newDur;
        body.endDateMode = endDateModeRef.current;
        willMutate = true;
        if (clamped) {
          try {
            const t = gantt.getTask(numericId);
            if (t) {
              t.start_date = parseDhxDate(clampedStart) ?? t.start_date;
              gantt.updateTask(numericId);
            }
          } catch { /* ignore */ }
        }
      } else {
        // Resize sem mudança discernível — skip.
        return true;
      }

      if (!willMutate) return true;
      if (didClamp) {
        showToastRef.current('info', tRef.current('task.info_adjusted_to_work_hours'));
      }
      apiFetch(`${api}/projects/${projectId}/planning/tasks/${publicId}`, {
        method: 'PUT', headers: h(), body: JSON.stringify(body),
      }).then(async (r) => {
        if (r.ok) {
          const saved = await r.json();
          const safe = JSON.parse(JSON.stringify(saved));
          setTasks((prev) => prev.map((tk) => tk.id === safe.id ? safe : tk));
          showToastRef.current('success', tRef.current('task.success_updated'));
        } else {
          const data = await r.json().catch(() => ({}));
          const code = (data.error_code as string | undefined)
            ?? (Array.isArray(data.message) ? data.message[0] : data.message);
          const friendly = code === 'TASK_DURATION_EXCEEDS_LIMIT'
            ? tRef.current('task.error_duration_too_long')
            : code === 'START_OUTSIDE_WORK_HOURS'
              ? tRef.current('task.error_start_outside_work_hours')
              : tRef.current('task.error_save');
          showToastRef.current('danger', friendly);
          loadAll().catch(() => {});
        }
      });
      return true;
    }

    // ── DAY — comportamento legacy (calendário inteiro) ─────────────────────
    // Em modo inclusive o frontend somou +1 dia ao end_date para o widget
    // (parseGanttData). Para reconstruir a duration "do utilizador" temos
    // de subtrair esse 1 dia ao calendário antes de dividir por 24h.
    const startMs = (widgetTask.start_date as Date)?.getTime?.()
      ?? (typeof widgetTask.start_date === 'string'
        ? (parseDhxDate(widgetTask.start_date)?.getTime() ?? 0)
        : 0);
    const endMs = (widgetTask.end_date as Date)?.getTime?.()
      ?? (typeof widgetTask.end_date === 'string'
        ? (parseDhxDate(widgetTask.end_date as string)?.getTime() ?? 0)
        : 0);
    const calendarHoursRaw = endMs > startMs ? (endMs - startMs) / 3_600_000 : 0;
    // No widget DHTMLX (em modo 'day' inclusive) o end é sempre exclusivo:
    // 1-day task = 24h calendar diff, 3-day = 72h. Round directo dá a duration.
    let widgetDurationInTaskUnit = Math.max(1, Math.round(calendarHoursRaw / 24));
    if (widgetDurationInTaskUnit > 1000) widgetDurationInTaskUnit = 1000;

    const startChanged = !fromBackend || widgetStartStrRaw !== fromBackend.start_date;
    const durationChanged = isResize
      && fromBackend
      && widgetDurationInTaskUnit !== fromBackend.duration;

    const body: Record<string, unknown> = { durationUnit: taskUnit };
    if (startChanged) body.start_date = widgetStartStrRaw;
    if (durationChanged) body.duration = widgetDurationInTaskUnit;
    if (startChanged || durationChanged) body.endDateMode = endDateModeRef.current;

    if (!startChanged && !durationChanged) {
      return true;
    }
    apiFetch(`${api}/projects/${projectId}/planning/tasks/${publicId}`, {
      method: 'PUT', headers: h(), body: JSON.stringify(body),
    }).then(async (r) => {
      if (r.ok) {
        const saved = await r.json();
        // Deep-clone defensivo — protege contra mutações futuras do widget
        // DHTMLX em re-parse (recompute de duration baseado em duration_unit
        // global). Sem isto, o React state pode ficar com valores recomputed
        // pelo widget e o TaskModal volta a salvar valor errado.
        const safe = JSON.parse(JSON.stringify(saved));
        setTasks((prev) => prev.map((tk) => tk.id === safe.id ? safe : tk));
        showToastRef.current('success', tRef.current('task.success_updated'));
      } else {
        // AppException devolve { error_code, statusCode }; ValidationPipe
        // devolve { message, statusCode }. Mapeia ambos para i18n.
        const data = await r.json().catch(() => ({}));
        const code = (data.error_code as string | undefined)
          ?? (Array.isArray(data.message) ? data.message[0] : data.message);
        const friendly = code === 'TASK_DURATION_EXCEEDS_LIMIT'
          ? tRef.current('task.error_duration_too_long')
          : code === 'START_OUTSIDE_WORK_HOURS'
            ? tRef.current('task.error_start_outside_work_hours')
            : tRef.current('task.error_save');
        showToastRef.current('danger', friendly);
        // Reload para reverter a barra ao estado anterior (a operação falhou).
        loadAll().catch(() => {});
      }
    });
    return true;
  }));

  evtIds.push(gantt.attachEvent('onAfterLinkAdd', function (_id: string, link: Record<string, unknown>) {
    const body = { source: Number(link.source), target: Number(link.target), type: link.type ?? '0', lag: Number(link.lag ?? 0) };
    apiFetch(`${api}/projects/${projectId}/planning/links`, {
      method: 'POST', headers: h(), body: JSON.stringify(body),
    }).then((r) => {
      if (r.ok) {
        r.json().then(() => { loadAll(); showToastRef.current('success', tRef.current('link.success_created')); });
      } else {
        showToastRef.current('danger', tRef.current('link.error_create'));
      }
    });
    return true;
  }));

  evtIds.push(gantt.attachEvent('onAfterLinkDelete', function (linkId: string, link: Record<string, unknown>) {
    const publicId = link?.publicId as string ?? linksRef.current.find((lnk) => String(lnk.id) === String(linkId))?.publicId;
    if (!publicId) return true;
    apiFetch(`${api}/projects/${projectId}/planning/links/${publicId}`, {
      method: 'DELETE', headers: h(),
    }).then((r) => {
      if (r.ok) {
        setLinks((prev) => prev.filter((lnk) => String(lnk.id) !== String(linkId)));
        showToastRef.current('success', tRef.current('link.success_deleted'));
      } else {
        showToastRef.current('danger', tRef.current('link.error_delete'));
      }
    });
    return true;
  }));

  evtIds.push(gantt.attachEvent('onBeforeTaskDisplay', function (_id: unknown, task: Record<string, unknown>) {
    const search = ganttSearchTextRef.current.trim().toLowerCase();
    if (!search) return true;
    return String(task.text ?? '').toLowerCase().includes(search);
  }));

  // Listener nativo de contextmenu no cabeçalho da grelha
  const handleHeaderContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.gantt_grid_head_cell') || target.closest('.gantt_grid_head')) {
      e.preventDefault();
      setColumnMenuPos({ x: e.clientX, y: e.clientY });
    }
  };
  ganttEl.addEventListener('contextmenu', handleHeaderContextMenu);

  return () => {
    evtIds.forEach((id) => gantt.detachEvent(id));
    ganttEl.removeEventListener('contextmenu', handleHeaderContextMenu);
  };
}

// ─── Granularidade do widget — toggle Day | Hour ──────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type GanttExt = any;

/** Escalas DAY: cabeçalho semana (range) + dia (número). Granularidade actual. */
export function applyDayScales(): void {
  const g = gantt as unknown as GanttExt;
  g.config.scales = [
    {
      unit: 'week', step: 1,
      format(date: Date) {
        const fmt = g.date.date_to_str('%d %M');
        const endDate = g.date.add(g.date.add(date, 1, 'week'), -1, 'day');
        return fmt(date) + ' - ' + fmt(endDate);
      },
    },
    { unit: 'day', step: 1, format: '%j' },
  ];
}

/** Escalas HOUR: cabeçalho dia (data curta) + hora (HH:mm). */
export function applyHourScales(): void {
  const g = gantt as unknown as GanttExt;
  g.config.scales = [
    { unit: 'day',  step: 1, format: '%d %M' },
    // step:2 reduz para metade o número de colunas-hora visíveis (00, 02, 04,
    // ...). Isto evita sobreposição visual do "HH:mm" quando min_column_width
    // ainda é apertado. Ver docs/claude/tools/gantt/rendering.md.
    { unit: 'hour', step: 2, format: '%H:%i' },
  ];
}

/**
 * Alterna a granularidade visual do widget Gantt entre dia e hora.
 *
 * - `day`: `duration_unit = 'day'`, `duration_step = 1`, escalas mês/dia.
 * - `hour`: `duration_unit = 'hour'`, `duration_step = 0.25` (snap 15min),
 *   escalas dia/hora.
 *
 * `start_date` e `end_date` são a verdade canónica (per docs DHTMLX) — quando
 * a unidade muda, recompute `duration` por task usando `gantt.calculateDuration`.
 * Tasks DAY e HOUR co-existem em ambos os modos: o toggle só muda escalas/snap,
 * não converte dados nem altera `task.durationUnit` (esse é per-task no DB).
 *
 * Ver docs/claude/tools/gantt/interactions.md.
 */
export function setGanttGranularity(mode: 'day' | 'hour'): void {
  const g = gantt as unknown as GanttExt;
  const prev = g.config.duration_unit as 'day' | 'hour' | undefined;
  g.config.duration_unit = mode;
  g.config.duration_step = mode === 'hour' ? 0.25 : 1;
  // min_column_width — em HOUR cada coluna é 1 step (2h por step) e tem que
  // caber "HH:mm" (5 chars). Com font 11px, 50px é o mínimo confortável.
  // Em DAY mantém o que o user tinha (zoom level).
  g.config.min_column_width = mode === 'hour' ? 50 : g.config.min_column_width;

  if (mode === 'hour') applyHourScales();
  else applyDayScales();

  if (prev && prev !== mode && typeof g.calculateDuration === 'function') {
    g.eachTask((t: { start_date: Date; end_date: Date; duration: number }) => {
      // Tasks HOUR têm duration canónico no backend (calculado por
      // addBusinessHoursInclusive com workHours + tz do projecto). Recompute
      // via gantt.calculateDuration produz drift sob inconsistência tz —
      // bug "24h → 96 → 384" em projectos com timezone (Maio 2026). Skip.
      if ((t as Record<string, unknown>).durationUnit === 'HOUR') return;
      try {
        const d = g.calculateDuration({
          start_date: t.start_date,
          end_date:   t.end_date,
          task: t,
        });
        if (typeof d === 'number' && Number.isFinite(d)) {
          t.duration = d;
        }
      } catch {
        /* ignore — task possivelmente sem end_date */
      }
    });
  }

  if (typeof g.render === 'function') g.render();
}
/* eslint-enable @typescript-eslint/no-explicit-any */
