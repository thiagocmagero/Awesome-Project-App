// Hook: carregamento de assets DHTMLX, inicialização do Gantt, zoom, colunas
import { useState, useMemo, useEffect, type MutableRefObject } from 'react';
import { getApiBase, apiFetch } from '../../lib/api';
import { formatDate } from '../../lib/dateFormatting';
import { GANTT_INLINE_STYLES } from './ganttStyles';
import {
  buildColumns, buildGanttLayout, parseGanttData,
  applyGanttColors, attachGanttEvents,
  applyDayScales, applyHourScales,
} from './ganttHelpers';
import { ZOOM_LEVELS, DEFAULT_ZOOM_INDEX, getMinZoomIndex } from './types';
import type {
  GanttTask, GanttLink, ResourceNode, ShowToastFn,
  GanttConfigData, GanttConfigColors,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: any, opts?: any) => string;

export interface UseGanttInitProps {
  projectId: string | undefined;
  token: string | null;
  pageTab: string;
  loading: boolean;
  configLoading: boolean;
  pageError: string;
  showGantt: boolean;
  ganttConfig: GanttConfigData;
  updateProjectConfig: (c: GanttConfigData) => Promise<boolean>;
  // Shared refs (created in orchestrator)
  ganttContainerRef: MutableRefObject<HTMLDivElement | null>;
  ganttInitialized: MutableRefObject<boolean>;
  ganttAssetsLoaded: MutableRefObject<boolean>;
  showResourceGridRef: MutableRefObject<boolean>;
  ganttSearchTextRef: MutableRefObject<string>;
  visibleColumnsRef: MutableRefObject<GanttConfigData['columns']>;
  endDateModeRef: MutableRefObject<'inclusive' | 'exclusive'>;
  /** Formato de data do projecto (ex.: 'DD/MM/YYYY'); aplicado em column templates + tooltip. */
  dateFormatRef: MutableRefObject<string>;
  /** Janela útil do projecto (ex.: { start: 9, end: 18 }); usada em setWorkTime. */
  workHoursRef: MutableRefObject<{ start: number; end: number } | null>;
  nonWorkingDaysRef: MutableRefObject<string[]>;
  tRef: MutableRefObject<TFn>;
  linksRef: MutableRefObject<GanttLink[]>;
  /** Tasks do estado React (espelho do backend) — fonte de verdade no onTaskDblClick. */
  tasksRef: MutableRefObject<GanttTask[]>;
  showToastRef: MutableRefObject<ShowToastFn>;
  canDoRef: MutableRefObject<(action: string) => boolean>;
  openCreateTaskRef: MutableRefObject<(parentId?: number) => void>;
  // Data (from usePlanningData)
  tasks: GanttTask[];
  links: GanttLink[];
  resourceNodes: ResourceNode[];
  nonWorkingDays: string[];
  setTasks: React.Dispatch<React.SetStateAction<GanttTask[]>>;
  setLinks: React.Dispatch<React.SetStateAction<GanttLink[]>>;
  // From useTaskForm
  openEditTask: (task: GanttTask) => void;
  // From usePlanningData
  loadAll: () => Promise<void>;
  // Orchestrator state setters
  setColumnMenuPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
}

export interface UseGanttInitReturn {
  ganttZoomLevel: number;
  ganttAllExpanded: boolean;
  showResourceGrid: boolean;
  autoScheduling: boolean;
  showTooltips: boolean;
  handleGanttToggleExpand: () => void;
  handleGanttZoomIn: () => void;
  handleGanttZoomOut: () => void;
  handleGanttZoomReset: () => void;
  clampZoomForViewUnit: (unit: 'day' | 'hour') => void;
  handleToggleResourceGrid: () => void;
  handleToggleAutoScheduling: () => void;
  handleToggleTooltips: () => void;
  toggleColumn: (col: keyof GanttConfigData['columns']) => void;
}

export function useGanttInit({
  projectId, token, pageTab, loading, configLoading, pageError, showGantt,
  ganttConfig, updateProjectConfig,
  ganttContainerRef, ganttInitialized, ganttAssetsLoaded,
  showResourceGridRef, ganttSearchTextRef, visibleColumnsRef,
  endDateModeRef, dateFormatRef, workHoursRef, nonWorkingDaysRef, tRef,
  linksRef, tasksRef, showToastRef, canDoRef, openCreateTaskRef,
  tasks, links, resourceNodes, nonWorkingDays,
  setTasks, setLinks, openEditTask, loadAll, setColumnMenuPos,
}: UseGanttInitProps): UseGanttInitReturn {
  const api = getApiBase();

  const [ganttZoomLevel, setGanttZoomLevel]     = useState(DEFAULT_ZOOM_INDEX);
  const [ganttAllExpanded, setGanttAllExpanded] = useState(true);
  const [showResourceGrid, setShowResourceGrid] = useState(true);
  const [autoScheduling, setAutoScheduling]     = useState(false);
  const [showTooltips, setShowTooltips]         = useState(true);

  // ── Asset loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!showGantt || ganttAssetsLoaded.current) return;
    ganttAssetsLoaded.current = true;

    if (!document.querySelector('link[href*="dhtmlxgantt.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/assets/libs/dhtmlxgantt/dhtmlxgantt.css';
      document.head.appendChild(link);

      const style = document.createElement('style');
      style.textContent = GANTT_INLINE_STYLES;
      document.head.appendChild(style);
    }

    if (!document.querySelector('script[src*="dhtmlxgantt.js"]')) {
      const s = document.createElement('script');
      s.src = '/assets/libs/dhtmlxgantt/dhtmlxgantt.js';
      document.body.appendChild(s);
    }
  }, [showGantt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resource panel config (stable memo — no deps) ────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resourceConfig = useMemo(() => ({
    columns: [
      {
        name: 'name', label: tRef.current('resource.col_name'), tree: true, width: 200,
        template(resource: Record<string, unknown>) { return resource.text as string; },
      },
      {
        name: 'hours', label: tRef.current('resource.col_hours'), width: 80, align: 'center',
        template(resource: Record<string, unknown>) {
          if (resource.isGroup) return '';
          return ((resource.hoursPerDay as number) ?? 8) + 'h';
        },
      },
      {
        name: 'workload', label: tRef.current('resource.col_workload'), width: 80,
        template(resource: Record<string, unknown>) {
          const store = gantt.getDatastore(gantt.config.resource_store);
          const field = gantt.config.resource_property;
          let rTasks: Array<Record<string, unknown>>;
          if (store.hasChild(resource.id)) {
            rTasks = gantt.getTaskBy(field, store.getChildren(resource.id));
          } else {
            rTasks = gantt.getTaskBy(field, resource.id);
          }
          let total = 0;
          for (const rTask of rTasks) total += (rTask.duration as number) || 0;
          const hpd = (resource.hoursPerDay as number) || 8;
          return (total * hpd) + 'h';
        },
      },
    ],
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helper: call parseGanttData helper with current state ────────────────────

  function doParse(
    currentTasks: GanttTask[],
    currentLinks: GanttLink[],
    currentResourceNodes: ResourceNode[],
  ) {
    if (!ganttInitialized.current) return;
    parseGanttData({
      tasks: currentTasks,
      links: currentLinks,
      resourceNodes: currentResourceNodes,
      nonWorkingDaysRef,
      endDateModeRef,
      tRef,
      workHours: workHoursRef.current,
    });
  }

  // ── DHTMLX Gantt — one-time initialization ───────────────────────────────────

  useEffect(() => {
    if (pageTab !== 'gantt') return;
    if (!ganttContainerRef.current || typeof gantt === 'undefined') return;
    if (loading || configLoading || pageError || ganttInitialized.current) return;

    // 1. Plugins
    gantt.plugins({ marker: true, auto_scheduling: true, tooltip: true });

    // 2. Config
    gantt.config.date_format           = '%d-%m-%Y %H:%i';
    gantt.config.auto_scheduling       = false;
    gantt.config.open_tree_initially   = true;
    gantt.config.order_branch          = true;
    gantt.config.drag_progress         = true;
    gantt.config.drag_links            = true;
    gantt.config.drag_resize           = true;
    gantt.config.drag_move             = true;
    gantt.config.resource_store        = 'resource';
    gantt.config.resource_property     = 'owner_id';
    gantt.config.work_time             = true;
    gantt.config.scale_height          = 50;
    gantt.config.min_column_width      = 30;
    gantt.config.row_height            = 30;
    gantt.config.scroll_size           = 10;
    // Smart rendering — render só do viewport visível. Critico em modo HOUR
    // onde 1 ano = ~4400 colunas. Sem isto, browser trava.
    gantt.config.smart_rendering       = true;
    gantt.config.static_background     = true;

    const _now = new Date();
    gantt.config.start_date = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);
    gantt.config.end_date   = new Date(_now.getFullYear(), _now.getMonth() + 3, 1);

    // Escalas iniciais conforme `viewUnit` persistido (default 'day').
    // O toggle Day/Hour (toolbar) chama `setGanttGranularity` para alternar
    // sem reinit. Ver docs/claude/tools/gantt/interactions.md.
    const initialViewUnit = ganttConfig.defaults?.viewUnit ?? 'day';
    if (initialViewUnit === 'hour') {
      gantt.config.duration_unit = 'hour';
      gantt.config.duration_step = 0.25;
      gantt.config.min_column_width = 50; // ver setGanttGranularity (rendering.md)
      applyHourScales();
    } else {
      gantt.config.duration_unit = 'day';
      gantt.config.duration_step = 1;
      applyDayScales();
    }

    // 3. Templates
    function toLocalDateStr(d: Date): string {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    gantt.templates.scale_cell_class = function (_date: Date) { return ''; };
    gantt.templates.timeline_cell_class = function (_item: unknown, date: Date) {
      const ds = toLocalDateStr(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (nonWorkingDaysRef.current.includes(ds)) return 'holiday';
      if (isWeekend) return 'weekend';
      return '';
    };

    // Tooltip template — respeita o modo de datas (inclusive vs exclusive)
    // e o formato de data do projecto. DHTMLX armazena `end_date` sempre
    // exclusiva; em modo inclusivo subtrair 1 dia (mesma fórmula da column
    // template em ganttHelpers.ts).
    gantt.templates.tooltip_text = function (start: Date, end: Date, task: { text?: string }) {
      const displayEnd = endDateModeRef.current === 'inclusive'
        ? new Date(end.getTime() - 86400000)
        : end;
      const text = task.text ?? '';
      return `<b>${text}</b><br/>` +
             `${tRef.current('gantt:gantt.col.start_date')}: ${formatDate(start, dateFormatRef.current)}<br/>` +
             `${tRef.current('gantt:gantt.col.end_date')}: ${formatDate(displayEnd, dateFormatRef.current)}`;
    };

    // Columns + layout
    endDateModeRef.current = (ganttConfig.defaults?.endDateMode ?? 'exclusive') as 'inclusive' | 'exclusive';
    gantt.config.columns = buildColumns(visibleColumnsRef.current, tRef, endDateModeRef, dateFormatRef, tasksRef);

    // Apply persisted config
    applyGanttColors(ganttConfig.colors as GanttConfigColors | undefined);
    if (ganttConfig.behavior) {
      if (ganttConfig.behavior.dragMove          !== undefined) gantt.config.drag_move           = ganttConfig.behavior.dragMove;
      if (ganttConfig.behavior.dragResize        !== undefined) gantt.config.drag_resize         = ganttConfig.behavior.dragResize;
      if (ganttConfig.behavior.dragLinks         !== undefined) gantt.config.drag_links          = ganttConfig.behavior.dragLinks;
      if (ganttConfig.behavior.dragProgress      !== undefined) gantt.config.drag_progress       = ganttConfig.behavior.dragProgress;
      if (ganttConfig.behavior.openTreeInitially !== undefined) gantt.config.open_tree_initially = ganttConfig.behavior.openTreeInitially;
    }
    if (ganttConfig.defaults?.zoomLevel !== undefined) {
      const zIdxRaw = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, ganttConfig.defaults.zoomLevel));
      // Em vista Hour aplica-se floor de 60% (idx 1) — projectos persistidos em
      // 33% antes desta regra abrem clamped.
      const initialUnitForZoom = (ganttConfig.defaults?.viewUnit ?? 'day') as 'day' | 'hour';
      const zIdx = Math.max(zIdxRaw, getMinZoomIndex(initialUnitForZoom));
      gantt.config.min_column_width = ZOOM_LEVELS[zIdx];
      setGanttZoomLevel(zIdx);
    }

    // Resource panel templates
    gantt.templates.resource_cell_class = function (_s: Date, _e: Date, _r: unknown, rTasks: unknown[]) {
      return ['resource_marker', rTasks.length <= 1 ? 'workday_ok' : 'workday_over'].join(' ');
    };
    gantt.templates.resource_cell_value = function (_s: Date, _e: Date, resource: Record<string, unknown>, rTasks: unknown[]) {
      const hpd = (resource.hoursPerDay as number) || 8;
      return '<div>' + rTasks.length * hpd + '</div>';
    };

    // Layout
    gantt.config.layout = buildGanttLayout(showResourceGridRef.current, resourceConfig);

    // Events (returns cleanup fn)
    const cleanupEvents = attachGanttEvents({
      ganttEl: ganttContainerRef.current!,
      projectId: projectId!,
      token,
      api,
      endDateModeRef,
      linksRef,
      tasksRef,
      showToastRef,
      canDoRef,
      workHoursRef,
      openCreateTaskRef,
      ganttSearchTextRef,
      tRef,
      setColumnMenuPos,
      setTasks,
      setLinks,
      openEditTask,
      loadAll,
    });

    // Resource datastore
    const resourcesStore = gantt.createDatastore({
      name: gantt.config.resource_store,
      type: 'treeDatastore',
      initItem(item: Record<string, unknown>) {
        item.parent = item.parent || gantt.config.root_id;
        item[gantt.config.resource_property] = item.parent;
        item.open = true;
        return item;
      },
    });

    resourcesStore.attachEvent('onParse', function () {
      const people: Array<Record<string, unknown>> = [];
      resourcesStore.eachItem(function (res: Record<string, unknown>) {
        if (!resourcesStore.hasChild(res.id)) {
          const copy = gantt.copy(res);
          copy.key = res.id;
          copy.label = res.text;
          people.push(copy);
        }
      });
      gantt.updateCollection('people', people);
    });

    // 4. Init
    gantt.init(ganttContainerRef.current);
    ganttInitialized.current = true;

    // 5. Parse
    doParse(tasks, links, resourceNodes);

    return () => {
      cleanupEvents();
      ganttInitialized.current = false;
      document.getElementById('gantt-tooltip-off')?.remove();
    };
  }, [pageTab, loading, configLoading, pageError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-sync when data changes (only when Gantt tab is visible) ───────────────

  useEffect(() => {
    if (!ganttInitialized.current || pageTab !== 'gantt') return;
    doParse(tasks, links, resourceNodes);
  }, [tasks, links, resourceNodes, nonWorkingDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-parse + resize when switching TO the Gantt tab
  useEffect(() => {
    if (pageTab === 'gantt' && ganttInitialized.current && typeof gantt !== 'undefined') {
      doParse(tasks, links, resourceNodes);
      setTimeout(() => gantt.setSizes(), 50);
    }
  }, [pageTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toolbar handlers ──────────────────────────────────────────────────────────

  function handleGanttToggleExpand() {
    if (!ganttInitialized.current) return;
    const next = !ganttAllExpanded;
    gantt.eachTask((task: Record<string, unknown>) => {
      if (next) gantt.open(task.id);
      else gantt.close(task.id);
    });
    setGanttAllExpanded(next);
  }

  function handleGanttZoomIn() {
    if (!ganttInitialized.current) return;
    const next = Math.min(ganttZoomLevel + 1, ZOOM_LEVELS.length - 1);
    gantt.config.min_column_width = ZOOM_LEVELS[next];
    gantt.render();
    setGanttZoomLevel(next);
  }

  function handleGanttZoomOut() {
    if (!ganttInitialized.current) return;
    // Floor depende do modo do widget: hour view não desce abaixo de 60% para
    // não amontoar as 24 colunas-hora num único dia visível.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const widgetUnit = ((gantt as any).config?.duration_unit as string | undefined) === 'hour' ? 'hour' : 'day';
    const minIdx = getMinZoomIndex(widgetUnit);
    const next = Math.max(ganttZoomLevel - 1, minIdx);
    gantt.config.min_column_width = ZOOM_LEVELS[next];
    gantt.render();
    setGanttZoomLevel(next);
  }

  /** Garante que ganttZoomLevel respeita o floor da vista actual. Usado pela
   *  PlanningPage ao trocar para vista Hour com zoom abaixo de 60%. */
  function clampZoomForViewUnit(unit: 'day' | 'hour') {
    if (!ganttInitialized.current) return;
    const minIdx = getMinZoomIndex(unit);
    if (ganttZoomLevel < minIdx) {
      gantt.config.min_column_width = ZOOM_LEVELS[minIdx];
      gantt.render();
      setGanttZoomLevel(minIdx);
    }
  }

  function handleGanttZoomReset() {
    if (!ganttInitialized.current) return;
    gantt.config.min_column_width = ZOOM_LEVELS[DEFAULT_ZOOM_INDEX];
    gantt.render();
    setGanttZoomLevel(DEFAULT_ZOOM_INDEX);
  }

  function handleToggleResourceGrid() {
    if (!ganttInitialized.current || typeof gantt === 'undefined') return;
    const next = !showResourceGridRef.current;
    showResourceGridRef.current = next;
    setShowResourceGrid(next);
    gantt.config.layout = buildGanttLayout(next, resourceConfig);
    gantt.resetLayout();
    doParse(tasks, links, resourceNodes);
  }

  function handleToggleAutoScheduling() {
    if (!ganttInitialized.current || typeof gantt === 'undefined') return;
    const next = !autoScheduling;
    setAutoScheduling(next);
    gantt.config.auto_scheduling = next;
    gantt.render();
    showToastRef.current(
      'warning',
      next ? tRef.current('gantt:gantt.auto_scheduling_on') : tRef.current('gantt:gantt.auto_scheduling_off'),
    );
  }

  function handleToggleTooltips() {
    if (!ganttInitialized.current || typeof gantt === 'undefined') return;
    const next = !showTooltips;
    setShowTooltips(next);
    if (next) {
      document.getElementById('gantt-tooltip-off')?.remove();
    } else {
      if (!document.getElementById('gantt-tooltip-off')) {
        const s = document.createElement('style');
        s.id = 'gantt-tooltip-off';
        s.textContent = '.gantt_tooltip { display: none !important; }';
        document.head.appendChild(s);
      }
    }
    showToastRef.current('info', next ? tRef.current('gantt:gantt.tooltips_on') : tRef.current('gantt:gantt.tooltips_off'));
  }

  function toggleColumn(col: keyof GanttConfigData['columns']) {
    const nextColumns = { ...visibleColumnsRef.current, [col]: !visibleColumnsRef.current[col] };
    if (ganttInitialized.current) {
      gantt.config.columns = buildColumns(nextColumns, tRef, endDateModeRef, dateFormatRef, tasksRef);
      gantt.render();
    }
    setColumnMenuPos(null);
    updateProjectConfig({ ...ganttConfig, columns: nextColumns }).then((ok) => {
      if (!ok) showToastRef.current('danger', tRef.current('gantt:gantt.error_save_config'));
    });
  }

  return {
    ganttZoomLevel, ganttAllExpanded,
    showResourceGrid, autoScheduling, showTooltips,
    handleGanttToggleExpand, handleGanttZoomIn, handleGanttZoomOut, handleGanttZoomReset,
    clampZoomForViewUnit,
    handleToggleResourceGrid, handleToggleAutoScheduling, handleToggleTooltips,
    toggleColumn,
  };
}
