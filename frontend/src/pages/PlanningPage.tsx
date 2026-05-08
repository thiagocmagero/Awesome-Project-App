import { useState, useEffect, useRef, useMemo, useCallback, type CSSProperties } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useBootstrapOffcanvas } from '../hooks/useBootstrapOffcanvas';
import { useGanttConfig, type GanttConfigColors, type GanttConfigData, type GanttConfigDefaults } from '../hooks/useGanttConfig';
import { getCellPatternPreviewStyle, CELL_PATTERN_OPTIONS, CELL_STYLE_FIELDS } from '../lib/ganttPatterns';
import { useToast } from '../contexts/ToastContext';
import { ProjectDateFormatProvider } from '../contexts/ProjectDateFormatContext';
import { TimezoneProvider } from '../contexts/TimezoneContext';
import { DEFAULT_DATE_FORMAT, toFlatpickrFormat } from '../lib/dateFormatting';
import Swal from 'sweetalert2';
import { toPng } from 'html-to-image';

// Features
import { usePlanningData }     from '../features/planning/usePlanningData';
import { useTaskForm }         from '../features/planning/useTaskForm';
import { useLinkForm }         from '../features/planning/useLinkForm';
import { useExternalResource } from '../features/planning/useExternalResource';
import { useGanttInit }        from '../features/planning/useGanttInit';
import { flattenTree, buildColumns, applyGanttColors, setGanttGranularity } from '../features/planning/ganttHelpers';
import { ganttToDate, formatGanttDate } from '../features/planning/ganttDateUtils';
import {
  COLOR_FIELDS, DEFAULT_COLORS, EMPTY_LINK_FORM,
  CONSTRAINT_NEEDS_DATE, type CellPattern, type TeamMember,
} from '../features/planning/types';
import { TaskTable }       from '../features/planning/components/TaskTable';
import { UnifiedToolbar }  from '../features/planning/components/UnifiedToolbar';
import { TaskModal, CommentTaskModal, DeleteTaskModal } from '../features/planning/components/TaskModal';
import { LinkModal }   from '../features/planning/components/LinkModal';
import { ExternalResourceModal, DeleteExtModal } from '../features/planning/components/ExternalResourceModal';
import { useProjectPermissions, ProjectAction } from '../hooks/useProjectPermissions';
import { usePlanningStates }    from '../features/planning/usePlanningStates';
import { StateModal }           from '../features/planning/components/StateModal';
import { DeleteStateModal }     from '../features/planning/components/DeleteStateModal';
import { StatesManagerPanel }   from '../features/planning/components/StatesManagerPanel';
import type { ITaskState }      from '../features/planning/states-types';
// Board feature (Maio 2026 — AwesomeKanban com sync ao backend)
import { BoardView, type BoardViewApi } from '../features/board/BoardView';
import { BoardConfigPanel }     from '../features/board/components/BoardConfigPanel';
import { useBoardConfig }       from '../features/board/useBoardConfig';
// Calendar feature
import { useCalendarData }   from '../features/calendar/useCalendarData';
import { useCalendarConfig } from '../features/calendar/useCalendarConfig';
import { useCalendarInit }   from '../features/calendar/useCalendarInit';
import { CalendarSourcesPanel }     from '../features/calendar/components/CalendarSourcesPanel';
import { CalendarEventModal }       from '../features/calendar/components/CalendarEventModal';
import { CalendarEventTypesPanel }  from '../features/calendar/components/CalendarEventTypesPanel';
import { CalendarHeader }           from '../features/calendar/components/CalendarHeader';
import type { ICalendarEvent, FullCalendarApi, CalendarView } from '../features/calendar/types';
// Timesheet feature
import { TimesheetView } from '../features/timesheet/components/TimesheetView';
// Files feature (Maio 2026 — uploads project-scoped)
import { FilesPanel } from '../features/files/components/FilesPanel';
import {
  addDaysISO,
  currentWeekStart as currentTimesheetWeekStart,
  currentMonthIso,
  prevMonthIso,
  nextMonthIso,
  monthIsoOfWeek,
  monthIsoWithinProject,
} from '../features/timesheet/dateUtils';

export default function PlanningPage() {
  const { id: projectId, taskId: deepLinkTaskId } = useParams<{ id: string; taskId?: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  // ── Permissions ───────────────────────────────────────────────────────────────
  const { can: canDo, isOwner: isProjectOwner, loading: permLoading } = useProjectPermissions(projectId);

  // ── Gantt config (3-level) ────────────────────────────────────────────────────
  const {
    config: ganttConfig,
    loading: configLoading,
    setConfig: setGanttConfig,
    updateProjectConfig,
  } = useGanttConfig(projectId);
  const visibleColumns = ganttConfig.columns;

  const TOGGLEABLE_COLS = [
    { key: 'start_date' as const, label: t('gantt:gantt.col.start_date') },
    { key: 'end_date'   as const, label: t('gantt:gantt.col.end_date') },
    { key: 'owner'      as const, label: t('gantt:gantt.col.owner') },
    { key: 'duration'   as const, label: t('gantt:gantt.col.duration') },
    { key: 'priority'   as const, label: t('gantt:gantt.col.priority') },
  ];

  // ── Shared refs ───────────────────────────────────────────────────────────────
  const tRef              = useRef(t);
  const nonWorkingDaysRef = useRef<string[]>([]);
  const isFirstLoad       = useRef(true);
  const ganttContainerRef    = useRef<HTMLDivElement>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const calendarInitialized  = useRef(false);
  const calendarInstanceRef  = useRef<FullCalendarApi | null>(null);
  const ganttInitialized  = useRef(false);
  const ganttAssetsLoaded = useRef(false);
  const linksRef          = useRef<typeof links>([]);
  const tasksRef          = useRef<typeof tasks>([]);
  const showToastRef      = useRef(showToast);
  // Permission gate ref — usado nos handlers DHTMLX (attachEvent capturam closure
  // estática, por isso precisamos de ref). Actualizado quando `canDo` muda.
  const canDoRef          = useRef<(action: string) => boolean>(() => false);
  const openCreateTaskRef = useRef<(parentId?: number, stateColumnPublicId?: string, parentPublicId?: string) => void>(() => {});
  const visibleColumnsRef = useRef(visibleColumns);
  const endDateModeRef    = useRef<'inclusive' | 'exclusive'>('exclusive');
  // Formato de data do projecto — `dateFormatRef` é actualizado num useEffect
  // sempre que `project.dateFormat` muda; usado nos templates DHTMLX (closure
  // estática captura o valor inicial sem o ref).
  const dateFormatRef     = useRef<string>('DD/MM/YYYY');
  // Janela útil do projecto — usado em setWorkTime + addBusinessHoursInclusive
  // (frontend não usa este último, mas alinha display com backend para tasks HOUR).
  const workHoursRef      = useRef<{ start: number; end: number } | null>(null);
  const showResourceGridRef  = useRef(true);
  const ganttSearchTextRef   = useRef('');
  // Debounce para PUT /gantt-config — color picker nativo dispara onChange a cada
  // tick de drag; sem debounce, o ThrottlerGuard do backend bloqueia com 429.
  const colorSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounce dos saves de "Horas por dia" disparados via onChange (setas/teclado).
  // Permite cancelar o save em curso quando o user dá blur ou continua a clicar.
  const memberHoursDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [searchParams] = useSearchParams();
  const initialTabFromQuery = searchParams.get('tab');
  const initialWeekFromQuery = searchParams.get('week');
  const [pageTab, setPageTab]                 = useState<'planning' | 'gantt' | 'board' | 'calendar' | 'timesheet' | 'files'>(
    initialTabFromQuery === 'timesheet' ? 'timesheet' :
    initialTabFromQuery === 'files'     ? 'files'     : 'planning',
  );
  const [planSubTab, setPlanSubTab]           = useState<'tasks' | 'resources' | 'links'>('tasks');
  // Granularidade visual do Gantt — inicial vem do GanttConfig (defaults.viewUnit).
  // O setter chama setGanttGranularity (escalas + duration_unit + recompute) e
  // persiste em GanttConfig PROJECT (fire-and-forget). Ver
  // docs/claude/tools/gantt/interactions.md.
  const [ganttViewUnit, setGanttViewUnit] = useState<'day' | 'hour'>('day');
  const [ganttConfigOpen, setGanttConfigOpen] = useState(false);
  const ganttConfigOffcanvasRef = useRef<HTMLDivElement>(null);
  useBootstrapOffcanvas(ganttConfigOffcanvasRef, ganttConfigOpen, () => setGanttConfigOpen(false));
  // Gestão de Estados (colunas do projecto) — acessível do Planning
  const [showStatesManager,  setShowStatesManager]  = useState(false);
  const [showStateModal,     setShowStateModal]     = useState(false);
  const [editingState,       setEditingState]       = useState<ITaskState | null>(null);
  const [showDeleteStateModal, setShowDeleteStateModal] = useState(false);
  const [deletingState,      setDeletingState]      = useState<ITaskState | null>(null);
  const [configTab, setConfigTab]             = useState<'columns' | 'colors' | 'defaults'>('columns');
  const [pendingEndDateMode, setPendingEndDateMode] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [columnMenuPos, setColumnMenuPos]     = useState<{ x: number; y: number } | null>(null);
  const [ganttSearchText, setGanttSearchText] = useState('');
  const [taskColumnFilter, setTaskColumnFilter] = useState('all');
  const [savingHours, setSavingHours]         = useState<Record<string, boolean>>({});
  const [commentTask, setCommentTask]         = useState<{ publicId: string; name: string } | null>(null);
  const [scriptsReady, setScriptsReady]       = useState(false);
  // Phase 5: passa projectId para resolução context-aware. Quando o user é
  // LICENSED no workspace do owner, herda as features do plano do owner.
  const { enabled: ganttEnabled } = useFeatureFlag('gantt_view', projectId ?? null);
  const showGantt = ganttEnabled || user?.profileCode === 'PLATFORM_ADMIN';
  const { enabled: calendarEnabled } = useFeatureFlag('calendar_view', projectId ?? null);
  const showCalendar = calendarEnabled || user?.profileCode === 'PLATFORM_ADMIN';
  const { enabled: timesheetEnabled } = useFeatureFlag('timesheet_view', projectId ?? null);
  const showTimesheet = timesheetEnabled || user?.profileCode === 'PLATFORM_ADMIN';
  const { enabled: uploadsEnabled } = useFeatureFlag('upload', projectId ?? null);
  const showFiles = uploadsEnabled || user?.profileCode === 'PLATFORM_ADMIN';
  // Timesheet UI state.
  // Default inicial 'mine' — depois um effect logo abaixo promove para 'team' se
  // o user tem TIMESHEET_APPROVE (gestor). Esta lógica corre uma vez quando as
  // permissões ficam disponíveis (`!permLoading`), e o ref garante que NÃO
  // sobrescreve uma escolha posterior do utilizador.
  const [timesheetSubTab, setTimesheetSubTab] = useState<'mine' | 'team'>('mine');
  const timesheetSubTabInitialized = useRef(false);
  const [timesheetWeekStart, setTimesheetWeekStart] = useState<string>(
    initialWeekFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(initialWeekFromQuery)
      ? initialWeekFromQuery
      : currentTimesheetWeekStart(),
  );
  const [timesheetTeamFilter, setTimesheetTeamFilter] =
    useState<'all' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PARTIAL' | 'DRAFT'>('all');
  const [showTimesheetAddEntry, setShowTimesheetAddEntry] = useState(false);
  const [showTimesheetCopyWeek, setShowTimesheetCopyWeek] = useState(false);
  const [showTimesheetHistory, setShowTimesheetHistory]   = useState(false);
  const [timesheetSubmitTrigger, setTimesheetSubmitTrigger] = useState(0);
  const [timesheetEditTrigger, setTimesheetEditTrigger]     = useState(0);
  const [timesheetWeekStatus, setTimesheetWeekStatus] = useState<'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIAL' | 'REJECTED' | null>(null);
  const [timesheetTeamCounts, setTimesheetTeamCounts] = useState<{ all: number; SUBMITTED: number; APPROVED: number; REJECTED: number; PARTIAL: number; DRAFT: number }>({
    all: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0, PARTIAL: 0, DRAFT: 0,
  });
  // Vista mensal — só relevante em subTab='team'. Default 'monthly' para gestor
  // ter o panorama antes de actuar.
  const [timesheetTeamView, setTimesheetTeamView] = useState<'monthly' | 'weekly'>('monthly');
  // Inicial — usa user.timezone.
  const [timesheetMonthIso, setTimesheetMonthIso] = useState<string>(
    () => currentMonthIso(user?.timezone ?? undefined),
  );
  const [timesheetProjectRange, setTimesheetProjectRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  // Estável (useCallback []) — evita loop infinito no useEffect do TimesheetView que
  // dependeria de uma callback inline (ref nova em cada render). Comparação prévia
  // evita actualização redundante do state quando o range é o mesmo.
  const handleTimesheetProjectRangeChange = useCallback((start: string | null, end: string | null) => {
    setTimesheetProjectRange((prev) =>
      (prev.start === start && prev.end === end) ? prev : { start, end },
    );
  }, []);
  // Calendar UI state
  const [showCalendarSources, setShowCalendarSources] = useState(true);
  const [showEventTypesModal, setShowEventTypesModal] = useState(false);
  const [showEventModal,      setShowEventModal]      = useState(false);
  const [editingEvent,        setEditingEvent]        = useState<ICalendarEvent | null>(null);
  const [pendingEventRange,   setPendingEventRange]   = useState<{ start: string; end: string; allDay: boolean } | null>(null);
  const [calendarTitle,       setCalendarTitle]       = useState('');
  const [calendarView,        setCalendarView]        = useState<CalendarView>('dayGridMonth');

  // ── Data hook ─────────────────────────────────────────────────────────────────
  const planningData = usePlanningData({ projectId, token, nonWorkingDaysRef, isFirstLoad });
  const {
    project, tasks, links, externalResources, resourceNodes, userTypes,
    memberHours, nonWorkingDays, loading, pageError, loadAll,
    setTasks, setLinks, setMemberHours,
  } = planningData;

  // ── States refresh ref: actualizado após usePlanningStates inicializar ───────
  // Permite que syncLoadAll refresque a lista de Estados após TaskModal guardar
  // (caso o user altere o estado da tarefa), sem depender da ordem de declaração
  // dos hooks (statesData vem depois de useTaskForm).
  const statesRefreshRef = useRef<() => void>(() => {});
  const syncLoadAll = useCallback(async () => {
    await loadAll();
    statesRefreshRef.current();
  }, [loadAll]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Task form hook ────────────────────────────────────────────────────────────
  const taskForm = useTaskForm({ projectId, token, tasks, endDateModeRef, loadAll: syncLoadAll, showToast, workHoursRef });
  const {
    showTaskModal, setShowTaskModal, taskModalKey, taskModalTab, setTaskModalTab,
    editingTask, taskForm: taskFormState, setTaskForm, taskOwnerIds, setTaskOwnerIds,
    taskFormError, taskFormLoading, showDeleteTask, setShowDeleteTask,
    deletingTask, setDeletingTask, deleteTaskLoading,
    openCreateTask, openEditTask, handleTaskSubmit, handleDeleteTask,
  } = taskForm;

  // FlatPickr refs (passed to TaskModal, effects managed here)
  const fpStartRef      = useRef<HTMLInputElement>(null);
  const fpConstraintRef = useRef<HTMLInputElement>(null);
  const choicesTypeRef        = useRef<HTMLSelectElement>(null);
  const choicesPriorityRef    = useRef<HTMLSelectElement>(null);
  const choicesConstraintRef  = useRef<HTMLSelectElement>(null);
  const choicesParentRef      = useRef<HTMLSelectElement>(null);

  // ── Link form hook ────────────────────────────────────────────────────────────
  const {
    showLinkModal, setShowLinkModal, linkForm, setLinkForm,
    linkFormError, linkFormLoading, deleteLinkLoading,
    handleLinkSubmit, handleDeleteLink,
  } = useLinkForm({ projectId, token, tasks, loadAll, showToast });

  // ── External resource hook ────────────────────────────────────────────────────
  const {
    showExtModal, setShowExtModal, editingExt, extForm, setExtForm,
    extFormError, extFormLoading, showDeleteExt, setShowDeleteExt,
    deletingExt, setDeletingExt, deleteExtLoading,
    openCreateExt, openEditExt, handleExtSubmit, handleDeleteExt,
  } = useExternalResource({ projectId, token, userTypes, loadAll, showToast });

  // ── Gantt init hook ───────────────────────────────────────────────────────────
  const {
    ganttZoomLevel, ganttAllExpanded, showResourceGrid,
    autoScheduling, showTooltips,
    handleGanttToggleExpand, handleGanttZoomIn, handleGanttZoomOut, handleGanttZoomReset,
    clampZoomForViewUnit,
    handleToggleResourceGrid, handleToggleAutoScheduling, handleToggleTooltips,
    toggleColumn,
  } = useGanttInit({
    projectId, token, pageTab, loading, configLoading, pageError, showGantt,
    ganttConfig, updateProjectConfig,
    ganttContainerRef, ganttInitialized, ganttAssetsLoaded,
    showResourceGridRef, ganttSearchTextRef, visibleColumnsRef,
    endDateModeRef, dateFormatRef, workHoursRef, nonWorkingDaysRef, tRef,
    linksRef, tasksRef, showToastRef, canDoRef, openCreateTaskRef,
    tasks, links, resourceNodes, nonWorkingDays,
    setTasks, setLinks, openEditTask, loadAll, setColumnMenuPos,
  });

  // ── Project date format → ref + re-render do Gantt ───────────────────────────
  // Quando o `project.dateFormat` mudar (mudança de página, edição directa do
  // projecto), actualizar o ref e re-renderizar o widget *sem* re-instanciar.
  useEffect(() => {
    const fmt = project?.dateFormat ?? DEFAULT_DATE_FORMAT;
    dateFormatRef.current = fmt;
    if (typeof gantt === 'undefined') return;
    if (!ganttInitialized.current) return;
    // Re-aplica colunas (templates capturam dateFormatRef.current) e re-renderiza
    // sem chamar gantt.init() — singleton continua intacto.
    try {
      gantt.config.columns = buildColumns(visibleColumnsRef.current, tRef, endDateModeRef, dateFormatRef, tasksRef);
      gantt.render();
    } catch { /* ignore — gantt may have just been destroyed */ }
  }, [project?.dateFormat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Project workHours → ref ──────────────────────────────────────────────────
  // Sincroniza o ref usado em parseGanttData (setWorkTime). Sem trigger de
  // re-render forçado — o próximo refresh natural apanha. Ver
  // docs/claude/tools/gantt/data-model.md.
  useEffect(() => {
    workHoursRef.current = project?.workHours ?? null;
  }, [project?.workHours]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── View fullscreen — partilhado entre Gantt / Calendar / Timesheet ──────────
  // Usa "fake fullscreen" via CSS (position:fixed; inset:0; z-index alto) em
  // vez da Fullscreen API nativa. Razão histórica: o widget Aw-Kanban (já
  // removido) tinha portais em document.body que ficavam invisíveis com a
  // Fullscreen API. Mantemos o "fake fullscreen" porque continua a ser a
  // solução mais robusta para coexistir com tooltips do DHTMLX Gantt e o
  // toaster do react-hot-toast (ambos vivem em document.body).
  // Esc continua a sair do modo (listener manual abaixo).
  const viewWrapperRef = useRef<HTMLDivElement>(null);
  const [viewFullscreen, setViewFullscreen] = useState(false);
  const handleViewFullscreen = useCallback(() => {
    setViewFullscreen((prev) => !prev);
  }, []);
  // Frame visual partilhado por todas as tabs (Planning/Gantt/Calendar/Timesheet).
  // Mantém border-radius + box-shadow também em fullscreen (preserva identidade visual
  // do frame mesmo a ocupar a viewport).
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
  // Esc para sair do fake fullscreen — replica UX da Fullscreen API nativa.
  useEffect(() => {
    if (!viewFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewFullscreen]);
  // Marca no body quando estamos em fake fullscreen — disponível para CSS
  // global se for preciso forçar z-index em portais que vivem em document.body.
  useEffect(() => {
    if (viewFullscreen) {
      document.body.classList.add('app-fake-fullscreen');
      return () => document.body.classList.remove('app-fake-fullscreen');
    }
  }, [viewFullscreen]);

  // ── Realocar overlays externos em fullscreen ─────────────────────────────────
  // Em fullscreen, qualquer elemento fora do `viewWrapperRef` fica invisível
  // (Fullscreen API esconde tudo o que não for descendente do elemento
  // fullscreen). Move-se para dentro do wrapper:
  //   • `.gantt_tooltip` — tooltip do DHTMLX Gantt (criada em document.body)
  //   • `.app-toaster`   — container do react-hot-toast (irmão de viewWrapperRef
  //                        no nível do ToastProvider)
  //
  // Listener+observer apanham elementos criados depois do toggle. Ao sair,
  // devolvem-se ao parent original (body para o tooltip; o pai do wrapper para
  // o toaster, para preservar a hierarquia React).
  useEffect(() => {
    if (!viewFullscreen) return;
    const wrapper = viewWrapperRef.current;
    if (!wrapper) return;

    // .gantt_modal_box — diálogo de confirmação do DHTMLX (e.g. ao double-click
    //   num link, "Delete this link?"). Sem realocação fica oculto pelo wrapper
    //   fullscreen.
    // .swal2-container — SweetAlert2 (confirmações de outras features que
    //   apareçam dentro do gantt).
    const SELECTOR = '.gantt_tooltip, .gantt_modal_box, .swal2-container, .app-toaster';
    const originalParents = new WeakMap<HTMLElement, HTMLElement>();

    const relocate = (el: HTMLElement) => {
      if (wrapper.contains(el)) return; // já dentro do wrapper subtree
      if (el.parentElement) originalParents.set(el, el.parentElement);
      wrapper.appendChild(el);
    };

    // Realocar elementos já existentes (em qualquer parent, não apenas body).
    document.querySelectorAll<HTMLElement>(SELECTOR).forEach(relocate);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.matches(SELECTOR)) {
            relocate(node);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      wrapper.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        const original = originalParents.get(el);
        (original ?? document.body).appendChild(el);
      });
    };
  }, [viewFullscreen]);

  // ── Planning states (Estados / colunas do projecto) ──────────────────────────
  // Substitui o antigo `useBoardData` (Abril 2026). Lê apenas o que o Planning
  // precisa: lista de Estados (TaskModal select, chips Row 2, offcanvas Gerir
  // Estados) + CRUD via permissão STATE_MANAGE. Sem cards/move/assign/swimlanes.
  const statesData = usePlanningStates(projectId);

  useEffect(() => { statesRefreshRef.current = statesData.refresh; }, [statesData.refresh]);

  // ── Board (Kanban) state ─────────────────────────────────────────────────────
  const {
    config: boardConfig,
    setConfig: setBoardConfig,
    updateUserConfig:    updateBoardUserConfig,
    updateProjectConfig: updateBoardProjectConfig,
  } = useBoardConfig(projectId);
  const [boardConfigOpen, setBoardConfigOpen] = useState(false);
  const [boardSearchText, setBoardSearchText] = useState('');
  const [boardShowSwimlanes, setBoardShowSwimlanes] = useState(false);
  const [boardCanUndo, setBoardCanUndo] = useState(false);
  const [boardCanRedo, setBoardCanRedo] = useState(false);
  const boardViewApiRef = useRef<BoardViewApi | null>(null);
  // Lazy mount: o BoardView só é montado quando o utilizador navega para o tab
  // Board pela primeira vez. Isso garante que o widget AwesomeKanban inicializa
  // com o container já visível (display:flex), evitando o bug onde o widget não
  // preenche o apiRef quando montado dentro de display:none.
  const [boardMounted, setBoardMounted] = useState(false);

  // ── Calendar hooks ────────────────────────────────────────────────────────────
  const calendarData   = useCalendarData(projectId);
  const { config: calendarConfig, updateUserConfig: updateCalendarUserConfig } = useCalendarConfig(projectId);
  const { t: tcal } = useTranslation('calendar');
  // Sync da view efectiva (config → state local mostrado pelo header)
  useEffect(() => {
    if (calendarConfig.view) setCalendarView(calendarConfig.view);
  }, [calendarConfig.view]);

  useCalendarInit({
    containerRef:   calendarContainerRef,
    initializedRef: calendarInitialized,
    instanceRef:    calendarInstanceRef,
    pageTab,
    showCalendar,
    permLoading,
    data:           calendarData.data,
    config:         calendarConfig,
    canDoCreate:    canDo(ProjectAction.CALENDAR_EVENT_CREATE),
    canDoEdit:      canDo(ProjectAction.CALENDAR_EVENT_EDIT),
    tCal:           tcal,
    locale:         (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en',
    onSelect: (start, end, allDay) => {
      if (!canDo(ProjectAction.CALENDAR_EVENT_CREATE)) return;
      setEditingEvent(null);
      setPendingEventRange({ start, end, allDay });
      setShowEventModal(true);
    },
    onEventClick: (eventPublicId) => {
      const ev = calendarData.data.events.find((e) => e.publicId === eventPublicId);
      if (ev) {
        setEditingEvent(ev);
        setPendingEventRange(null);
        setShowEventModal(true);
      }
    },
    onTaskClick: (taskPublicId) => {
      const task = tasks.find((tk) => tk.publicId === taskPublicId);
      if (task) openEditTask(task);
    },
    onEventDrop: async (eventPublicId, newStart, newEnd) => {
      await calendarData.updateEvent(eventPublicId, { startAt: newStart, endAt: newEnd });
    },
    onEventResize: async (eventPublicId, newStart, newEnd) => {
      await calendarData.updateEvent(eventPublicId, { startAt: newStart, endAt: newEnd });
    },
    onDatesSet: (title, viewType) => {
      setCalendarTitle(title);
      if (viewType === 'dayGridMonth' || viewType === 'timeGridWeek' || viewType === 'timeGridDay' || viewType === 'listWeek') {
        setCalendarView(viewType);
      }
    },
  });

  // O FullCalendar não detecta sozinho quando o seu container muda de dimensões
  // (toggle do painel de fontes, entrada/saída de fullscreen, mudança de tab).
  // updateSize() força o recálculo após o browser aplicar o novo layout.
  useEffect(() => {
    if (pageTab !== 'calendar') return;
    if (!calendarInitialized.current || !calendarInstanceRef.current) return;
    const id = requestAnimationFrame(() => {
      calendarInstanceRef.current?.updateSize();
    });
    return () => cancelAnimationFrame(id);
  }, [showCalendarSources, viewFullscreen, pageTab]);

  // Default subtab da Timesheet: gestor (TIMESHEET_APPROVE) entra em "team",
  // contributor/reader em "mine". Corre uma única vez por sessão da página
  // (via ref flag) — escolhas posteriores do utilizador não são sobrescritas.
  useEffect(() => {
    if (timesheetSubTabInitialized.current) return;
    if (permLoading) return;
    timesheetSubTabInitialized.current = true;
    if (canDo(ProjectAction.TIMESHEET_APPROVE)) setTimesheetSubTab('team');
  }, [permLoading, canDo]);

  // Lazy mount do Board: monta o BoardView apenas quando o utilizador navega
  // para o tab Board pela primeira vez, para que o widget AwesomeKanban
  // inicialize com o container já visível (display:flex) e preencha o apiRef.
  useEffect(() => {
    if (pageTab === 'board') setBoardMounted(true);
  }, [pageTab]);

  // Auto-activar swimlanes quando passam de 0 → N (carga inicial ou criação).
  // Reseta a cada page load (ref in-memory), pelo que um refresh sempre mostra
  // swimlanes se existirem.
  const prevSwimlanesCountRef = useRef(0);
  useEffect(() => {
    const count = statesData.swimlanes.length;
    if (count > 0 && prevSwimlanesCountRef.current === 0) {
      setBoardShowSwimlanes(true);
    }
    prevSwimlanesCountRef.current = count;
  }, [statesData.swimlanes.length]);

  // ── Ref sync effects ──────────────────────────────────────────────────────────
  useEffect(() => { tRef.current             = t;                      }, [t]);
  useEffect(() => { showToastRef.current     = showToast;              }, [showToast]);
  useEffect(() => { canDoRef.current         = (a: string) => canDo(a as ProjectAction); }, [canDo]);
  useEffect(() => { linksRef.current         = links;                  }, [links]);
  useEffect(() => { tasksRef.current         = tasks;                  }, [tasks]);
  useEffect(() => { visibleColumnsRef.current = visibleColumns;        }, [visibleColumns]);
  useEffect(() => { openCreateTaskRef.current = openCreateTask;        }, [openCreateTask]);
  useEffect(() => { ganttSearchTextRef.current = ganttSearchText;
    if (ganttInitialized.current && typeof gantt !== 'undefined' && pageTab === 'gantt')
      gantt.render();
  }, [ganttSearchText, pageTab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    memberHoursDebounceRef.current.forEach((t) => clearTimeout(t));
    memberHoursDebounceRef.current.clear();
  }, []);

  // ── Gantt config sync effects ─────────────────────────────────────────────────
  useEffect(() => { applyGanttColors(ganttConfig.colors as GanttConfigColors | undefined); }, [ganttConfig.colors]);
  useEffect(() => {
    const mode = (ganttConfig.defaults?.endDateMode ?? 'exclusive') as 'inclusive' | 'exclusive';
    endDateModeRef.current = mode;
    setPendingEndDateMode(mode);
    if (ganttInitialized.current && typeof gantt !== 'undefined') {
      gantt.config.columns = buildColumns(visibleColumnsRef.current, tRef, endDateModeRef, dateFormatRef, tasksRef);
      gantt.render();
    }
  }, [ganttConfig.defaults?.endDateMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync ganttViewUnit do config persistido. No primeiro mount o widget já é
  // inicializado com a vista correcta (useGanttInit lê config.defaults?.viewUnit);
  // este effect alinha o state local para a toolbar reflectir o estado.
  useEffect(() => {
    const next = (ganttConfig.defaults?.viewUnit ?? 'day') as 'day' | 'hour';
    setGanttViewUnit(next);
  }, [ganttConfig.defaults?.viewUnit]);

  // Handler do toggle Day | Hour. Chama setGanttGranularity (mexe em
  // duration_unit, scales, recompute durations) e persiste em GanttConfig
  // PROJECT (fire-and-forget; rollback em caso de falha).
  const handleChangeGanttViewUnit = useCallback((mode: 'day' | 'hour') => {
    if (mode === ganttViewUnit) return;
    setGanttViewUnit(mode); // optimistic
    if (ganttInitialized.current && typeof gantt !== 'undefined') {
      try { setGanttGranularity(mode); } catch { /* widget pode não estar pronto */ }
    }
    // Aplica floor de zoom da nova vista (Hour não desce abaixo de 60%).
    clampZoomForViewUnit(mode);
    const nextDefaults = { ...(ganttConfig.defaults ?? {}), viewUnit: mode } as GanttConfigDefaults;
    const nextConfig = { ...ganttConfig, defaults: nextDefaults };
    updateProjectConfig(nextConfig).catch(() => {
      // Rollback do state — o widget mantém-se no novo modo (UX-wise é OK,
      // o user vê o efeito visual e o save falha silenciosamente).
      setGanttViewUnit(ganttViewUnit);
    });
  }, [ganttViewUnit, ganttConfig, updateProjectConfig, clampZoomForViewUnit]);

  // Cleanup custom color style + pending debounced save on unmount
  useEffect(() => () => {
    document.getElementById('gantt-custom-colors')?.remove();
    if (colorSaveTimerRef.current) {
      clearTimeout(colorSaveTimerRef.current);
      colorSaveTimerRef.current = null;
    }
  }, []);

  // ── Deep link ─────────────────────────────────────────────────────────────────
  const deepLinkOpened = useRef(false);
  useEffect(() => { deepLinkOpened.current = false; }, [deepLinkTaskId]);
  useEffect(() => {
    if (!deepLinkTaskId || loading || tasks.length === 0 || deepLinkOpened.current) return;
    const task = tasks.find((tk) => tk.publicId === deepLinkTaskId);
    if (task) { deepLinkOpened.current = true; openEditTask(task); }
  }, [deepLinkTaskId, loading, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scripts ready (for FlatPickr/Choices) ────────────────────────────────────
  useEffect(() => {
    if (typeof Choices !== 'undefined' && typeof flatpickr !== 'undefined') { setScriptsReady(true); return; }
    const id = setInterval(() => {
      if (typeof Choices !== 'undefined' && typeof flatpickr !== 'undefined') { setScriptsReady(true); clearInterval(id); }
    }, 50);
    return () => clearInterval(id);
  }, []);

  // ── Gantt export handlers ─────────────────────────────────────────────────────

  /** PDF: abre o gantt numa janela popup e lança o diálogo de impressão do browser
   *  (o utilizador escolhe "Guardar como PDF" e orientação paisagem). */
  const handleExportPdf = useCallback(() => {
    const el = ganttContainerRef.current;
    if (!el) return;

    // Captura estilos de cor custom injectados dinamicamente
    const customColorsStyle = document.getElementById('gantt-custom-colors')?.innerHTML ?? '';

    // Clona o DOM renderizado do Gantt (inclui todos os inline styles do DHTMLX)
    const clonedHtml = el.outerHTML;
    const projectName = project?.name ?? 'Gantt';

    const win = window.open('', '_blank', 'width=1280,height=800');
    if (!win) {
      showToast('warning', t('gantt:gantt.export.popup_blocked'));
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>${projectName}</title>
  <link rel="stylesheet" href="/assets/libs/dhtmlxgantt/dhtmlxgantt.css" />
  <style>
    @page { size: landscape; margin: 0.8cm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #gantt_here {
      width: 100vw !important;
      height: 100vh !important;
      min-height: 0 !important;
    }
    /* Ocultar scrollbars na janela de impressão */
    ::-webkit-scrollbar { display: none; }
    ${customColorsStyle}
  </style>
</head>
<body>
  ${clonedHtml}
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 600);
    });
  <\/script>
</body>
</html>`);
    win.document.close();
  }, [project?.name, showToast, t]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Imagem PNG: captura o container do Gantt com html-to-image e faz download. */
  const handleExportImage = useCallback(async () => {
    const el = ganttContainerRef.current;
    if (!el) return;
    showToast('info', t('gantt:gantt.export.generating_image'));
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        // Duplica a resolução para melhor qualidade em ecrãs HiDPI
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      a.download = `${project?.name ?? 'gantt'}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error('[Gantt Export Image]', err);
      showToast('danger', t('gantt:gantt.export.image_error'));
    }
  }, [project?.name, showToast, t]);

  /** JSON: serializa tarefas, dependências e projecto para download. */
  const handleExportJson = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      project: project ? {
        publicId: project.publicId,
        name:     project.name,
      } : null,
      tasks: tasks.map((tk) => ({
        publicId:        tk.publicId,
        text:            tk.text,
        type:            tk.type,
        start_date:      tk.start_date,
        end_date:        tk.end_date ?? null,
        duration:        tk.duration,
        progress:        tk.progress,
        parent:          tk.parent,
        priority:        tk.priority ?? null,
        constraint_type: tk.constraint_type ?? null,
        constraint_date: tk.constraint_date ?? null,
      })),
      links: links.map((lk) => ({
        publicId: lk.publicId,
        source:   lk.source,
        target:   lk.target,
        type:     lk.type,
        lag:      lk.lag,
      })),
    };
    const json  = JSON.stringify(payload, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.download  = `${project?.name ?? 'gantt'}.json`;
    a.href      = url;
    a.click();
    URL.revokeObjectURL(url);
  }, [project, tasks, links]);

  // ── Body overflow (any modal open) ────────────────────────────────────────────
  // Offcanvas (ganttConfig/eventTypes) gerem o seu próprio overflow via Bootstrap.
  const anyModalOpen = showTaskModal || showDeleteTask || showLinkModal || showExtModal || showDeleteExt
    || showStateModal || showDeleteStateModal || showEventModal;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

  // ── Column menu click-outside ─────────────────────────────────────────────────
  useEffect(() => {
    if (!columnMenuPos) return;
    const handler = (e: MouseEvent) => {
      const menu = document.getElementById('gantt-col-menu');
      if (menu && !menu.contains(e.target as Node)) setColumnMenuPos(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [columnMenuPos]);

  // ── FlatPickr — task modal ────────────────────────────────────────────────────
  // Formato derivado do projecto. `project?.dateFormat` no dep array → o effect
  // recria o FlatPickr (destroy + new) quando o user mudar o formato.
  const taskFlatpickrFormat = toFlatpickrFormat(project?.dateFormat ?? DEFAULT_DATE_FORMAT, true);
  useEffect(() => {
    if (!showTaskModal || typeof flatpickr === 'undefined') return;
    const instances: Array<{ destroy(): void }> = [];
    if (fpStartRef.current) {
      instances.push(flatpickr(fpStartRef.current, {
        enableTime: true, dateFormat: taskFlatpickrFormat, time_24hr: true,
        defaultDate: editingTask ? ganttToDate(editingTask.start_date) : null,
        onChange: (selectedDates: Date[]) => {
          const d = selectedDates[0];
          setTaskForm((f) => ({ ...f, start_date: d ? formatGanttDate(d) : '' }));
        },
      }));
    }
    return () => { instances.forEach((fp) => fp.destroy()); };
  }, [showTaskModal, scriptsReady, taskModalKey, taskFlatpickrFormat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showTaskModal || !CONSTRAINT_NEEDS_DATE.has(taskFormState.constraint_type)) return;
    if (typeof flatpickr === 'undefined' || !fpConstraintRef.current) return;
    const fp = flatpickr(fpConstraintRef.current, {
      enableTime: true, dateFormat: taskFlatpickrFormat, time_24hr: true,
      defaultDate: editingTask?.constraint_date ? ganttToDate(editingTask.constraint_date) : null,
      onChange: (selectedDates: Date[]) => {
        const d = selectedDates[0];
        setTaskForm((f) => ({ ...f, constraint_date: d ? formatGanttDate(d) : '' }));
      },
    });
    return () => fp.destroy();
  }, [showTaskModal, taskFormState.constraint_type, scriptsReady, taskModalKey, taskFlatpickrFormat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Choices.js — task modal ───────────────────────────────────────────────────
  useEffect(() => {
    if (!showTaskModal || typeof Choices === 'undefined') return;
    const instances: Array<{ destroy(): void }> = [];

    // Choices.js lê `option.selected` (não o `value` controlado pelo React).
    // Pré-seleccionar explicitamente antes de criar a instância — padrão idêntico
    // ao select de Owner (multi-select) abaixo.
    if (choicesParentRef.current) {
      const parentVal = taskFormState.parent;
      Array.from(choicesParentRef.current.options).forEach((opt) => {
        opt.selected = opt.value === parentVal;
      });
    }

    const init = (ref: React.RefObject<HTMLSelectElement | null>, searchable = false) => {
      if (!ref.current) return;
      instances.push(new Choices(ref.current, {
        searchEnabled: searchable,
        searchPlaceholderValue: searchable ? t('task.form.parent_search') : undefined,
        itemSelectText: '',
        shouldSort: false,
        allowHTML: false,
      } as Record<string, unknown>));
    };
    init(choicesTypeRef); init(choicesPriorityRef); init(choicesConstraintRef);
    init(choicesParentRef, true);
    // Estado deixou de ter <select> no TaskModal (clicável directo no QuickFact).
    return () => { instances.forEach((c) => c.destroy()); };
  }, [showTaskModal, tasks, scriptsReady, taskModalKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ─────────────────────────────────────────────────────────────
  const teamMembers = useMemo<TeamMember[]>(() => {
    if (!project) return [];
    const seen = new Set<string>();
    const people: TeamMember[] = [];
    for (const pt of project.teams) {
      for (const m of pt.team.members ?? []) {
        if (!seen.has(m.user.publicId)) {
          seen.add(m.user.publicId);
          people.push({
            id: m.user.id, publicId: m.user.publicId,
            name: m.user.name, email: m.user.email, status: m.user.status,
            teamName: pt.team.name,
            userTypeCode: m.user.userType?.code ?? null,
            userTypeLabel: m.user.userType?.label ?? null,
          });
        }
      }
    }
    return people;
  }, [project]);

  const allResourcesByType = useMemo(() => {
    const groups = new Map<string, { label: string; items: Array<{ id: string; name: string; avatarUrl: string | null }> }>();
    for (const n of resourceNodes) if (n.isGroup) groups.set(n.id, { label: n.text, items: [] });
    for (const n of resourceNodes)
      if (!n.isGroup && n.parent) {
        groups.get(n.parent)?.items.push({ id: n.id, name: n.text, avatarUrl: n.avatarUrl });
      }
    return groups;
  }, [resourceNodes]);

  const nodeMap = useMemo(() => {
    const m = new Map<typeof resourceNodes[0], typeof resourceNodes[0]>();
    const result = new Map<string, typeof resourceNodes[0]>();
    for (const n of resourceNodes) if (!n.isGroup) result.set(n.id, n);
    void m;
    return result;
  }, [resourceNodes]);

  const flatTasks    = flattenTree(tasks);
  const filteredTasks = taskColumnFilter === 'all'
    ? flatTasks
    : flatTasks.filter((tk) => (tk.boardColumn ?? '') === taskColumnFilter);
  const columnCounts = statesData.states.reduce<Record<string, number>>((acc, col) => {
    acc[col.publicId] = tasks.filter((tk) => tk.boardColumn === col.publicId).length;
    return acc;
  }, {});

  // ── Handlers that stay in orchestrator ───────────────────────────────────────

  function h() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }; }

  /**
   * Actualiza cor/padrão com feedback visual imediato e save debounced.
   * - `applyGanttColors` muda o CSS injectado no momento (sem lag na grelha).
   * - `setGanttConfig` mantém os inputs controlled em sincronia sem PUT.
   * - `updateProjectConfig` é agendado 400 ms depois do último tick para
   *   evitar o 429 do ThrottlerGuard quando o user arrasta pelo color picker.
   */
  function scheduleColorSave(nextConfig: GanttConfigData, errorKey: string) {
    if (colorSaveTimerRef.current) clearTimeout(colorSaveTimerRef.current);
    colorSaveTimerRef.current = setTimeout(() => {
      colorSaveTimerRef.current = null;
      updateProjectConfig(nextConfig).then((ok) => {
        if (!ok) showToastRef.current('danger', tRef.current(errorKey));
      });
    }, 400);
  }

  function handleColorChange(key: keyof GanttConfigColors, value: string) {
    const nextColors = { ...(ganttConfig.colors ?? {}), [key]: value } as GanttConfigColors;
    const nextConfig = { ...ganttConfig, colors: nextColors };
    applyGanttColors(nextColors);
    setGanttConfig(nextConfig);
    scheduleColorSave(nextConfig, 'gantt:gantt.error_save_colors');
  }

  function handleCellStyleReset(colorKey: keyof GanttConfigColors, patternKey: keyof GanttConfigColors, defaultColor: string) {
    const nextColors = { ...(ganttConfig.colors ?? {}), [colorKey]: defaultColor, [patternKey]: 'diagonal' } as GanttConfigColors;
    const nextConfig = { ...ganttConfig, colors: nextColors };
    applyGanttColors(nextColors);
    setGanttConfig(nextConfig);
    scheduleColorSave(nextConfig, 'gantt:gantt.error_reset_pattern');
  }

  async function handleDefaultsChange(key: keyof GanttConfigDefaults, value: unknown) {
    if (key === 'endDateMode') {
      const newMode = value as 'inclusive' | 'exclusive';
      const currentMode = (ganttConfig.defaults?.endDateMode ?? 'exclusive') as 'inclusive' | 'exclusive';
      if (newMode === currentMode) return;
      const result = await Swal.fire({
        title: t('gantt:gantt.settings.end_date_mode_label'),
        html: newMode === 'inclusive'
          ? `<p>Ao mudar para <strong>${t('gantt:gantt.settings.end_date_inclusive')}</strong>, o sistema vai recalcular e guardar a data de fim de <strong>todas as tarefas</strong> deste projecto.</p><p class="mt-2 mb-0">Exemplo: início 02/03, duração 1d → fim <strong>02/03</strong> (antes: 03/03).</p>`
          : `<p>Ao mudar para <strong>${t('gantt:gantt.settings.end_date_exclusive')}</strong>, o sistema vai recalcular e guardar a data de fim de <strong>todas as tarefas</strong> deste projecto.</p><p class="mt-2 mb-0">Exemplo: início 02/03, duração 1d → fim <strong>03/03</strong> (antes: 02/03).</p>`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#735DFF', cancelButtonColor: '#d33',
        confirmButtonText: t('gantt:gantt.confirm_end_mode_ok'), cancelButtonText: tc('actions.cancel'),
      });
      if (!result.isConfirmed) { setPendingEndDateMode(currentMode); return; }
      endDateModeRef.current = newMode;
      const nextDefaults = { ...(ganttConfig.defaults ?? {}), [key]: newMode };
      const configSaved = await updateProjectConfig({ ...ganttConfig, defaults: nextDefaults });
      if (!configSaved) { showToastRef.current('danger', tRef.current('gantt:gantt.error_save_config')); endDateModeRef.current = currentMode; return; }
      try {
        const res = await apiFetch(`${api}/projects/${projectId}/planning/tasks/recalculate-end-dates`,
          { method: 'POST', headers: h(), body: JSON.stringify({ endDateMode: newMode }) });
        if (res.ok) { const data = await res.json(); showToastRef.current('success', tRef.current('gantt:gantt.recalculate_success', { affected: data.affected })); }
        else showToastRef.current('danger', tRef.current('gantt:gantt.error_recalculate'));
      } catch { showToastRef.current('danger', tRef.current('gantt:gantt.error_recalculate')); }
      setGanttConfigOpen(false);
      if (ganttInitialized.current && typeof gantt !== 'undefined') {
        gantt.config.columns = buildColumns(visibleColumnsRef.current, tRef, endDateModeRef, dateFormatRef, tasksRef);
        gantt.render();
      }
      await loadAll();
      return;
    }
    const nextDefaults = { ...(ganttConfig.defaults ?? {}), [key]: value } as GanttConfigDefaults;
    updateProjectConfig({ ...ganttConfig, defaults: nextDefaults }).then((ok) => {
      if (!ok) showToastRef.current('danger', tRef.current('gantt:gantt.error_save_config'));
    });
  }

  async function saveHours(userPublicId: string, value: number) {
    setSavingHours((prev) => ({ ...prev, [userPublicId]: true }));
    try {
      const res = await apiFetch(`${api}/projects/${projectId}/planning/member-hours/${userPublicId}`,
        { method: 'PUT', headers: h(), body: JSON.stringify({ hoursPerDay: value }) });
      if (res.ok) {
        // Disparar toast IMEDIATAMENTE antes de qualquer setState/re-fetch para
        // que o `<Toaster>` registe o item no microtask actual (sem ser intercalado
        // pelos múltiplos re-renders provocados por setMemberHours + loadAll).
        const okMsg = tRef.current('resource.hours_saved');
        showToastRef.current('success', okMsg && okMsg !== 'resource.hours_saved' ? okMsg : 'Hours saved');
        setMemberHours((prev) => ({ ...prev, [userPublicId]: value }));
        loadAll();
      } else {
        const errMsg = tRef.current('resource.hours_error');
        showToastRef.current('danger', errMsg && errMsg !== 'resource.hours_error' ? errMsg : 'Failed to save hours.');
      }
    } catch {
      const errMsg = tRef.current('resource.hours_error');
      showToastRef.current('danger', errMsg && errMsg !== 'resource.hours_error' ? errMsg : 'Failed to save hours.');
    } finally {
      setSavingHours((prev) => ({ ...prev, [userPublicId]: false }));
    }
  }

  // Map id-numérico → resumo da task — usado no TaskModal aba "Links" para
  // mostrar source/target como texto da task (em vez de "#42").
  // IMPORTANTE: hook tem que vir ANTES de qualquer early return (regras dos
  // hooks — ordem fixa entre renders).
  const tasksById = useMemo(() => {
    const map = new Map<number, { publicId: string; text: string }>();
    for (const t of tasks) map.set(t.id, { publicId: t.publicId, text: t.text });
    return map;
  }, [tasks]);

  // ── Loading / error states ────────────────────────────────────────────────────
  if (loading && isFirstLoad.current) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
      <div className="spinner-border text-primary" role="status" />
    </div>
  );
  if (pageError) return (
    <div className="alert alert-danger m-4">
      <i className="ri-error-warning-line me-2" />{pageError}
      <button className="btn btn-sm btn-outline-danger ms-3" onClick={loadAll}>{tc('actions.refresh')}</button>
    </div>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────────
  return (
    <ProjectDateFormatProvider projectFormat={project?.dateFormat}>
    <TimezoneProvider userTimezone={user?.timezone ?? null}>
    <div>

      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between my-3 flex-wrap gap-2">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb breadcrumb-style2 mb-0">
            <li className="breadcrumb-item">
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
                <i className="ti ti-home-2 me-1 fs-15 d-inline-block" />{tc('nav.dashboard')}
              </a>
            </li>
            <li className="breadcrumb-item">
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/projects'); }}>
                <i className="ti ti-folder me-1 fs-15 d-inline-block" />{tc('nav.projects')}
              </a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">{project?.name}</li>
          </ol>
        </nav>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/projects')}>
          <i className="ri-arrow-left-line me-1" />{tc('nav.projects')}
        </button>
      </div>

      <div className="d-flex align-items-center mb-3">
        <h5 className="fw-semibold mb-0">
          <i className="ri-folder-line me-2 text-primary" />{project?.name}
        </h5>
      </div>

      {/* Wrapper de vista — fullscreen target. Inclui toolbar + tab content
          para que o modo fullscreen mantenha a toolbar visível. */}
      <div
        ref={viewWrapperRef}
        style={viewFullscreen ? {
          // Fake fullscreen: cobre o viewport via position:fixed (sem usar a
          // Fullscreen API). z-index alto, mas inferior aos popups DHTMLX
          // (que continuam em document.body e ganham z-index máximo via CSS
          // injectado em :fullscreen — não, agora não há :fullscreen activo;
          // os popups continuam por cima naturalmente porque .wx-popup tem
          // position:fixed/absolute e ficam siblings de wrapper no body).
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          background: '#fff',
          padding: '12px 16px',
          gap: 8,
          overflow: 'auto',
        } : undefined}
      >
      {/* Toolbar unificada — Row 1 (abas + acções) + Row 2 (contextual) */}
      <UnifiedToolbar
        pageTab={pageTab}
        setPageTab={setPageTab}
        showGantt={showGantt}
        showCalendar={showCalendar}
        showTimesheet={showTimesheet}
        showFiles={showFiles}
        planSubTab={planSubTab}
        setPlanSubTab={setPlanSubTab}
        counts={{
          tasks: tasks.length,
          resources: teamMembers.length + externalResources.length,
          links: links.length,
        }}
        taskStates={statesData.states}
        taskColumnFilter={taskColumnFilter}
        setTaskColumnFilter={setTaskColumnFilter}
        columnCounts={columnCounts}
        totalTasks={tasks.length}
        ganttSearchText={ganttSearchText}
        setGanttSearchText={setGanttSearchText}
        onExportPdf={handleExportPdf}
        onExportImage={handleExportImage}
        onExportJson={handleExportJson}
        onOpenStates={() => setShowStatesManager(true)}
        onCreateTask={() => openCreateTask()}
        ganttAllExpanded={ganttAllExpanded}
        ganttZoomLevel={ganttZoomLevel}
        viewFullscreen={viewFullscreen}
        showResourceGrid={showResourceGrid}
        autoScheduling={autoScheduling}
        showTooltips={showTooltips}
        handleGanttToggleExpand={handleGanttToggleExpand}
        handleGanttZoomIn={handleGanttZoomIn}
        handleGanttZoomOut={handleGanttZoomOut}
        handleGanttZoomReset={handleGanttZoomReset}
        handleToggleResourceGrid={handleToggleResourceGrid}
        handleToggleAutoScheduling={handleToggleAutoScheduling}
        handleToggleTooltips={handleToggleTooltips}
        handleViewFullscreen={handleViewFullscreen}
        setGanttConfigOpen={setGanttConfigOpen}
        ganttViewUnit={ganttViewUnit}
        onChangeGanttViewUnit={handleChangeGanttViewUnit}
        onOpenEventTypes={() => setShowEventTypesModal(true)}
        onCreateEvent={() => {
          setEditingEvent(null);
          setPendingEventRange(null);
          setShowEventModal(true);
        }}
        calendarSourcesOpen={showCalendarSources}
        onToggleCalendarSources={() => setShowCalendarSources((v) => !v)}
        boardSearchText={boardSearchText}
        setBoardSearchText={setBoardSearchText}
        boardShowSwimlanes={boardShowSwimlanes}
        boardSwimlaneCount={statesData.swimlanes.length}
        onToggleBoardSwimlanes={() => setBoardShowSwimlanes((v) => !v)}
        onBoardUndo={() => { void boardViewApiRef.current?.undo(); }}
        onBoardRedo={() => { void boardViewApiRef.current?.redo(); }}
        boardCanUndo={boardCanUndo}
        boardCanRedo={boardCanRedo}
        onAddBoardColumn={() => boardViewApiRef.current?.addColumn()}
        onAddBoardSwimlane={() => boardViewApiRef.current?.addSwimlane()}
        onOpenBoardConfig={() => setBoardConfigOpen(true)}
        onCreateTimesheetEntry={() => setShowTimesheetAddEntry(true)}
        timesheetSubTab={timesheetSubTab}
        setTimesheetSubTab={setTimesheetSubTab}
        timesheetWeekStart={timesheetWeekStart}
        timesheetWeekStatus={timesheetWeekStatus}
        onPrevTimesheetWeek={() => setTimesheetWeekStart((w) => addDaysISO(w, -7))}
        onNextTimesheetWeek={() => setTimesheetWeekStart((w) => addDaysISO(w, 7))}
        onCopyTimesheetWeek={() => setShowTimesheetCopyWeek(true)}
        onSubmitTimesheetWeek={() => setTimesheetSubmitTrigger((n) => n + 1)}
        onEditTimesheetWeek={() => setTimesheetEditTrigger((n) => n + 1)}
        timesheetTeamFilter={timesheetTeamFilter}
        setTimesheetTeamFilter={setTimesheetTeamFilter}
        timesheetTeamCounts={timesheetTeamCounts}
        onOpenTimesheetHistory={() => setShowTimesheetHistory(true)}
        timesheetTeamView={timesheetTeamView}
        setTimesheetTeamView={setTimesheetTeamView}
        timesheetMonthIso={timesheetMonthIso}
        onPrevTimesheetMonth={() => setTimesheetMonthIso((m) => prevMonthIso(m))}
        onNextTimesheetMonth={() => setTimesheetMonthIso((m) => nextMonthIso(m))}
        onTodayTimesheetMonth={() => setTimesheetMonthIso(currentMonthIso(user?.timezone ?? undefined))}
        timesheetMonthIsAtStart={
          !monthIsoWithinProject(prevMonthIso(timesheetMonthIso),
            timesheetProjectRange.start, timesheetProjectRange.end)
        }
        timesheetMonthIsAtEnd={
          !monthIsoWithinProject(nextMonthIso(timesheetMonthIso),
            timesheetProjectRange.start, timesheetProjectRange.end)
        }
        canDo={(action: string) => canDo(action as ProjectAction)}
      />

      {/* ── Tab Planeamento ─────────────────────────────────────────────────── */}
      {pageTab === 'planning' && (
        <div style={viewFrameStyle(true)}>
          <div style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: '16px',
          }}>
            {/* Tasks sub-tab */}
            {planSubTab === 'tasks' && (
              <TaskTable
                filteredTasks={filteredTasks}
                boardColumns={statesData.states}
                nodeMap={nodeMap}
                isFiltered={taskColumnFilter !== 'all'}
                openEditTask={openEditTask}
                setCommentTask={setCommentTask}
                setDeletingTask={setDeletingTask}
                setShowDeleteTask={setShowDeleteTask}
                canDo={(action: string) => canDo(action as ProjectAction)}
              />
            )}

            {/* Resources sub-tab */}
            {planSubTab === 'resources' && (
              <div role="tabpanel">
                <div className="d-flex align-items-center mb-2 mt-2">
                  <h6 className="fw-semibold mb-0">
                    <i className="ri-group-line me-2 text-primary" />
                    {t('resource.section_members')}
                    <span className="badge bg-primary-transparent text-primary ms-2">{teamMembers.length}</span>
                  </h6>
                </div>
                {teamMembers.length === 0 ? (
                  <div className="alert alert-warning d-flex align-items-center gap-2">
                    <i className="ri-information-line fs-18 flex-shrink-0" />
                    <div>
                      {t('resource.no_teams_message')}{' '}
                      <a href="#" className="alert-link" onClick={(e) => { e.preventDefault(); navigate('/projects'); }}>
                        {t('resource.no_teams_link')}
                      </a>{' '}
                      {t('resource.no_teams_suffix')}
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive mb-4">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>{tc('table.name')}</th>
                          <th>{t('resource.col_email')}</th>
                          <th>{t('resource.col_team')}</th>
                          <th>{t('resource.col_status')}</th>
                          <th style={{ width: '160px' }}>{t('resource.hours_per_day')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((m) => {
                          const currentHours = memberHours[m.publicId] ?? 8;
                          const saving = savingHours[m.publicId] ?? false;
                          return (
                            <tr key={m.publicId}>
                              <td className="fw-medium fs-13">{m.name}</td>
                              <td className="text-muted fs-13">{m.email}</td>
                              <td className="fs-13">{m.teamName}</td>
                              <td>
                                {m.status === 'ACTIVE'
                                  ? <span className="badge bg-success-transparent text-success">{tc('status.active')}</span>
                                  : <span className="badge bg-warning-transparent text-warning">{tc('status.inactive')}</span>}
                              </td>
                              <td>
                                <div className="input-group input-group-sm" style={{ maxWidth: '110px' }}>
                                  <input
                                    type="number" className="form-control form-control-sm"
                                    min={0} max={24} step={0.5}
                                    defaultValue={currentHours} key={currentHours}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      if (isNaN(v) || v < 0 || v > 24 || v === currentHours) return;
                                      const prev = memberHoursDebounceRef.current.get(m.publicId);
                                      if (prev) clearTimeout(prev);
                                      const handle = setTimeout(() => {
                                        memberHoursDebounceRef.current.delete(m.publicId);
                                        saveHours(m.publicId, v);
                                      }, 600);
                                      memberHoursDebounceRef.current.set(m.publicId, handle);
                                    }}
                                    onBlur={(e) => {
                                      const prev = memberHoursDebounceRef.current.get(m.publicId);
                                      if (prev) { clearTimeout(prev); memberHoursDebounceRef.current.delete(m.publicId); }
                                      const v = parseFloat(e.target.value);
                                      if (!isNaN(v) && v >= 0 && v <= 24 && v !== currentHours) saveHours(m.publicId, v);
                                    }}
                                    disabled={saving || !canDo(ProjectAction.MEMBER_HOURS_MANAGE)}
                                    readOnly={!canDo(ProjectAction.MEMBER_HOURS_MANAGE)}
                                  />
                                  <span className="input-group-text">h</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-semibold mb-0">
                    <i className="ri-user-add-line me-2 text-secondary" />
                    {t('resource.section_external')}
                    <span className="badge bg-secondary-transparent text-secondary ms-2">{externalResources.length}</span>
                  </h6>
                  {canDo(ProjectAction.RESOURCE_MANAGE) && (
                    <button className="btn btn-sm btn-secondary" onClick={openCreateExt}>
                      <i className="ri-add-line me-1" />{t('ext.btn_add')}
                    </button>
                  )}
                </div>
                {externalResources.length === 0 ? (
                  <div className="text-muted fs-13 py-2"><i className="ri-information-line me-1" />{t('ext.empty')}</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>{tc('table.name')}</th>
                          <th>{tc('table.type')}</th>
                          <th style={{ width: '120px' }}>{t('resource.hours_per_day')}</th>
                          <th className="text-end">{tc('table.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {externalResources.map((r) => (
                          <tr key={r.publicId}>
                            <td className="fw-medium fs-13">{r.text}</td>
                            <td><span className="badge bg-info-transparent text-info fs-11">{r.userType.label}</span></td>
                            <td className="fs-13">{r.hoursPerDay}h</td>
                            <td className="text-end">
                              <div className="d-flex gap-1 justify-content-end">
                                {canDo(ProjectAction.RESOURCE_MANAGE) && (
                                  <>
                                    <button className="btn btn-sm btn-icon btn-primary-transparent" title={tc('actions.edit')} onClick={() => openEditExt(r)}>
                                      <i className="ri-pencil-line" />
                                    </button>
                                    <button className="btn btn-sm btn-icon btn-danger-transparent" title={tc('actions.delete')} onClick={() => { setDeletingExt(r); setShowDeleteExt(true); }}>
                                      <i className="ri-delete-bin-line" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Links sub-tab */}
            {planSubTab === 'links' && (
              <div role="tabpanel">
                <div className="d-flex justify-content-end mb-3 mt-2">
                  {canDo(ProjectAction.LINK_MANAGE) && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setLinkForm({ ...EMPTY_LINK_FORM }); setShowLinkModal(true); }}
                      disabled={tasks.length < 2}
                      title={tasks.length < 2 ? t('link.min_tasks_hint') : undefined}
                    >
                      <i className="ri-add-line me-1" />{t('link.btn_create')}
                    </button>
                  )}
                </div>
                {links.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="ri-links-line fs-1 d-block mb-2 opacity-50" />
                    <p className="mb-0">{t('link.empty')}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>{t('link.table.source')}</th>
                          <th>{t('link.table.target')}</th>
                          <th>{t('link.table.type')}</th>
                          <th>{t('link.table.lag')}</th>
                          <th className="text-end">{tc('table.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {links.map((lnk) => {
                          const src = tasks.find((tk) => tk.id === lnk.source);
                          const tgt = tasks.find((tk) => tk.id === lnk.target);
                          const typeLabel: Record<string, string> = { '0': 'FS', '1': 'SS', '2': 'FF', '3': 'SF' };
                          return (
                            <tr key={lnk.id}>
                              <td className="fs-13 fw-medium">{src?.text ?? `#${lnk.source}`}</td>
                              <td className="fs-13 fw-medium">{tgt?.text ?? `#${lnk.target}`}</td>
                              <td><span className="badge bg-secondary-transparent text-secondary">{typeLabel[lnk.type] ?? lnk.type}</span></td>
                              <td className="fs-13 text-muted">{lnk.lag !== 0 ? t('link.lag_days', { count: lnk.lag }) : '—'}</td>
                              <td className="text-end">
                                {canDo(ProjectAction.LINK_MANAGE) && (
                                  <button className="btn btn-sm btn-icon btn-danger-transparent" disabled={deleteLinkLoading === lnk.id} onClick={() => handleDeleteLink(lnk)}>
                                    {deleteLinkLoading === lnk.id ? <span className="spinner-border spinner-border-sm" /> : <i className="ri-delete-bin-line" />}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Gantt ─────────────────────────────────────────────────────────── */}
      {showGantt && (
        <div style={viewFrameStyle(pageTab === 'gantt')}>
          <div
            ref={ganttContainerRef}
            id="gantt_here"
            style={{
              width: '100%',
              height: viewFullscreen ? '100%' : 'calc(100vh - 365px)',
              minHeight: viewFullscreen ? 0 : 500,
              flex: viewFullscreen ? 1 : undefined,
            }}
          />
        </div>
      )}

      {/* ── Tab Board (AwesomeKanban com sync ao backend, Maio 2026) ──────────
           Sem altura fixa: o `.ak-board` cresce com o conteúdo e a rolagem
           pertence à página (viewWrapperRef). Em fullscreen, `flex:1` faz o
           wrapper preencher o viewport — o overflow vive em viewWrapperRef. */}
      <div style={{
        ...viewFrameStyle(pageTab === 'board'),
        // Board cresce sempre com o conteúdo — a rolagem pertence ao viewWrapperRef.
        // Em fullscreen: `flex:'none'` (= flex:0 0 auto) impede que o flex-shrink:1
        // do default comprima o frame até ao viewport height quando o board é maior.
        // Com flex:'none' o frame toma a altura natural do .ak-board e o
        // viewWrapperRef (overflow-y:auto) faz scroll quando excede o viewport.
        ...(viewFullscreen ? { flex: 'none', width: '100%' } : {}),
      }}>
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 500,
          }}
        >
          {boardMounted && (
            <BoardView
              projectPublicId={projectId ?? ''}
              tasks={tasks}
              states={statesData.states}
              swimlanes={statesData.swimlanes}
              project={project}
              resourceNodes={resourceNodes}
              config={boardConfig}
              searchQuery={boardSearchText}
              showSwimlanes={boardShowSwimlanes}
              dataReady={!loading && !statesData.loading}
              canDo={(action) => canDo(action as ProjectAction)}
              onDataChanged={async () => { await loadAll(); await statesData.refresh(); }}
              apiHandleRef={boardViewApiRef}
              onHistoryChange={(undo, redo) => { setBoardCanUndo(undo); setBoardCanRedo(redo); }}
              onOpenCreateTask={(boardColumnPublicId, parentPublicId) =>
                openCreateTask(0, boardColumnPublicId, parentPublicId)}
              onOpenEditTask={(taskPublicId, initialTab) => {
                const task = tasks.find((t) => t.publicId === taskPublicId);
                if (task) openEditTask(task, initialTab ?? 'details');
              }}
              onRequestDeleteTask={(taskPublicId) => {
                const task = tasks.find((t) => t.publicId === taskPublicId);
                if (task) {
                  setDeletingTask(task);
                  setShowDeleteTask(true);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Offcanvas de configuração do Board (engrenagem) */}
      <BoardConfigPanel
        open={boardConfigOpen}
        onClose={() => setBoardConfigOpen(false)}
        config={boardConfig}
        onSaveProject={updateBoardProjectConfig}
        onLocalChange={setBoardConfig}
      />

      {/* ── Tab Calendar ────────────────────────────────────────────────────── */}
      {showCalendar && (
        <>
          {pageTab === 'calendar' && (
            <>
              {calendarData.loading && (
                <div className="d-flex justify-content-center align-items-center py-5">
                  <span className="spinner-border text-primary me-2" />
                  <span className="text-muted">{tc('messages.loading')}</span>
                </div>
              )}
              {calendarData.error && !calendarData.loading && (
                <div className="alert alert-danger d-flex align-items-center gap-2">
                  <i className="ri-error-warning-line fs-18" />
                  {tcal('errors.load_failed')}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger ms-auto"
                    onClick={calendarData.refreshCalendar}
                  >
                    {tc('actions.refresh')}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Calendar frame: sources panel + main grid (always in DOM, hidden via display:none no wrapper) */}
          <div style={viewFrameStyle(pageTab === 'calendar')}>
            <div className="calendar-layout" style={{ flex: 1, minHeight: 0 }}>
              <CalendarSourcesPanel
                open={showCalendarSources}
                config={calendarConfig}
                eventTypes={calendarData.data.eventTypes}
                holidays={calendarData.data.holidays}
                onUpdateConfig={(patch) => { updateCalendarUserConfig(patch); }}
              />
              <div className="calendar-main">
                <CalendarHeader
                  instance={calendarInstanceRef.current}
                  title={calendarTitle}
                  view={calendarView}
                  onChangeView={(v) => {
                    setCalendarView(v);
                    calendarInstanceRef.current?.changeView(v);
                    updateCalendarUserConfig({ view: v });
                  }}
                />
                <div ref={calendarContainerRef} id="fullcalendar_here" className="calendar-zynix" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Tab Timesheet ───────────────────────────────────────────────────── */}
      {showTimesheet && projectId && (
        <div style={viewFrameStyle(pageTab === 'timesheet')}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <TimesheetView
            projectPublicId={projectId}
            weekStart={timesheetWeekStart}
            subTab={timesheetSubTab}
            teamView={timesheetTeamView}
            monthIso={timesheetMonthIso}
            canDoLog={canDo(ProjectAction.TIMESHEET_LOG)}
            canDoApprove={canDo(ProjectAction.TIMESHEET_APPROVE)}
            showAddEntryModal={showTimesheetAddEntry}
            showCopyWeekModal={showTimesheetCopyWeek}
            showHistoryModal={showTimesheetHistory}
            onCloseAddEntry={() => setShowTimesheetAddEntry(false)}
            onCloseCopyWeek={() => setShowTimesheetCopyWeek(false)}
            onCloseHistory={() => setShowTimesheetHistory(false)}
            onOpenHistory={() => setShowTimesheetHistory(true)}
            submitTrigger={timesheetSubmitTrigger}
            editTrigger={timesheetEditTrigger}
            teamFilter={timesheetTeamFilter}
            onDrillDownToWeek={(weekStartIso) => {
              // Drill-down: monthly → weekly numa semana específica.
              setTimesheetWeekStart(weekStartIso);
              setTimesheetTeamView('weekly');
              // Manter o monthIso alinhado para quando o user voltar a Mensal.
              setTimesheetMonthIso(monthIsoOfWeek(weekStartIso));
            }}
            onWeekStatusChange={setTimesheetWeekStatus}
            onTeamCountsChange={setTimesheetTeamCounts}
            onProjectRangeChange={handleTimesheetProjectRangeChange}
          />
          </div>
        </div>
      )}

      {/* ── Tab Ficheiros do Projeto ────────────────────────────────────────── */}
      {showFiles && projectId && (
        <div style={viewFrameStyle(pageTab === 'files')}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>
            <FilesPanel
              projectPublicId={projectId}
              taskPublicId={null}
              enabled={pageTab === 'files'}
            />
          </div>
        </div>
      )}

      {/* Column context menu */}
      {columnMenuPos && (
        <div
          id="gantt-col-menu"
          style={{
            position: 'fixed', top: columnMenuPos.y, left: columnMenuPos.x, zIndex: 9999,
            background: '#fff', border: '1px solid #e0e0e0', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 180, padding: '4px 0', fontSize: 13,
          }}
        >
          <div style={{ padding: '6px 14px 4px', fontWeight: 600, color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('gantt:gantt.config.visible_columns')}
          </div>
          {TOGGLEABLE_COLS.map(({ key, label }) => (
            <div
              key={key}
              onClick={() => toggleColumn(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', cursor: 'pointer', userSelect: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <i className={`ti ${visibleColumns[key] ? 'ti-checkbox' : 'ti-square'} fs-15`} style={{ color: visibleColumns[key] ? '#735DFF' : '#aaa' }} />
              <span style={{ color: '#333' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gantt Config Offcanvas */}
      <div
        ref={ganttConfigOffcanvasRef}
        className="offcanvas offcanvas-end"
        tabIndex={-1}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title"><i className="ti ti-settings me-2" />{t('gantt:gantt.config.title')}</h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label={tc('actions.close')}
          />
        </div>
        <div className="offcanvas-body">
          <ul className="nav nav-tabs tab-style-2 nav-justified mb-3 d-flex" style={{ flexWrap: 'nowrap' }}>
            <li className="nav-item">
              <button className={`nav-link${configTab === 'columns' ? ' active' : ''}`} onClick={() => setConfigTab('columns')}>
                {t('gantt:gantt.config.tab_columns')}
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link${configTab === 'colors' ? ' active' : ''}`} onClick={() => setConfigTab('colors')}>
                {t('gantt:gantt.config.tab_colors')}
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link${configTab === 'defaults' ? ' active' : ''}`} onClick={() => setConfigTab('defaults')}>
                {t('gantt:gantt.config.tab_defaults')}
              </button>
            </li>
          </ul>

          {configTab === 'columns' && (
            <>
              {TOGGLEABLE_COLS.map(({ key, label }) => (
                <div key={key} className="d-flex align-items-center justify-content-between mb-3">
                  <span className="fs-14">{label}</span>
                  <div className="form-check form-switch mb-0">
                    <input className="form-check-input" type="checkbox" checked={visibleColumns[key]} onChange={() => toggleColumn(key)} />
                  </div>
                </div>
              ))}
            </>
          )}

          {configTab === 'colors' && (
            <>
              {COLOR_FIELDS.map(({ key }) => {
                const colorLabelMap: Record<string, string> = {
                  taskBar: t('gantt:gantt.color.task_bar.label'), taskBarProject: t('gantt:gantt.color.task_project.label'),
                  milestone: t('gantt:gantt.color.milestone.label'), links: t('gantt:gantt.color.links.label'),
                  todayMarker: t('gantt:gantt.color.today.label'),
                };
                const val = (ganttConfig.colors?.[key] ?? DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS]) as string;
                return (
                  <div key={key} className="d-flex align-items-center justify-content-between mb-3">
                    <span className="fs-14">{colorLabelMap[key] ?? key}</span>
                    <div className="d-flex align-items-center gap-2">
                      <input type="color" className="form-control form-control-color" value={val}
                        onChange={(e) => handleColorChange(key as keyof GanttConfigColors, e.target.value)}
                        style={{ width: 38, height: 30, padding: 2, cursor: 'pointer' }} title={val} />
                      <button className="btn btn-sm btn-light" title={t('gantt:gantt.settings.reset_color_btn')}
                        onClick={() => handleColorChange(key as keyof GanttConfigColors, DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS])}>
                        <i className="ti ti-rotate fs-14" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <p className="switcher-style-head mt-3">{t('gantt:gantt.config.cell_patterns_title')}:</p>
              <div className="row switcher-style gx-0">
                {CELL_STYLE_FIELDS.map(({ colorKey, patternKey, label, hint, defaultColor }) => {
                  const colorVal   = (ganttConfig.colors?.[colorKey]   ?? defaultColor) as string;
                  const patternVal = (ganttConfig.colors?.[patternKey] ?? 'diagonal')   as CellPattern;
                  return (
                    <div key={String(colorKey)} className="mb-3">
                      <div className="fs-14 mb-2">{label} <span className="text-muted fs-12">— {hint}</span></div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <input type="color" className="form-control form-control-color" value={colorVal}
                          onChange={(e) => handleColorChange(colorKey as keyof GanttConfigColors, e.target.value)}
                          style={{ width: 38, height: 30, padding: 2, cursor: 'pointer' }} title={colorVal} />
                        <div style={getCellPatternPreviewStyle(colorVal, patternVal)} />
                        <select className="form-select form-select-sm flex-grow-1" value={patternVal}
                          onChange={(e) => handleColorChange(patternKey as keyof GanttConfigColors, e.target.value)}>
                          {CELL_PATTERN_OPTIONS.map(({ value, label: lbl }) => (
                            <option key={value} value={value}>{lbl}</option>
                          ))}
                        </select>
                        <button className="btn btn-sm btn-light" title={t('gantt:gantt.settings.reset_color_btn')}
                          onClick={() => handleCellStyleReset(colorKey as keyof GanttConfigColors, patternKey as keyof GanttConfigColors, defaultColor)}>
                          <i className="ti ti-rotate fs-14" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {configTab === 'defaults' && (
            <>
              <div>
                <p className="switcher-style-head">{t('gantt:gantt.settings.end_date_mode_label')}:</p>
                <div className="row switcher-style gx-0">
                  <div>
                    <select className="form-select form-select-sm" value={pendingEndDateMode}
                      onChange={(e) => setPendingEndDateMode(e.target.value as 'inclusive' | 'exclusive')}>
                      <option value="exclusive">{t('gantt:gantt.settings.end_date_exclusive')}</option>
                      <option value="inclusive">{t('gantt:gantt.settings.end_date_inclusive')}</option>
                    </select>
                    <div className="text-muted fs-12 mt-2">
                      {t('gantt:gantt.config.end_date_example', { end: pendingEndDateMode === 'inclusive' ? '02/03' : '03/03' })}
                    </div>
                    {pendingEndDateMode !== (ganttConfig.defaults?.endDateMode ?? 'exclusive') && (
                      <button type="button" className="btn btn-sm btn-primary mt-3 w-100"
                        onClick={() => handleDefaultsChange('endDateMode', pendingEndDateMode)}>
                        <i className="ti ti-check me-1 fs-13" />{t('gantt:gantt.config.apply_btn')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showTaskModal && (
        <TaskModal
          projectId={projectId}
          editingTask={editingTask}
          taskModalTab={taskModalTab}
          setTaskModalTab={setTaskModalTab}
          taskForm={taskFormState}
          setTaskForm={setTaskForm}
          taskFormError={taskFormError}
          taskFormLoading={taskFormLoading}
          taskOwnerIds={taskOwnerIds}
          setTaskOwnerIds={setTaskOwnerIds}
          tasks={tasks}
          taskLinks={links}
          tasksById={tasksById}
          onRemoveLink={(linkPublicId) => {
            const target = links.find((l) => l.publicId === linkPublicId);
            if (target) handleDeleteLink(target);
          }}
          onAddLink={() => setShowLinkModal(true)}
          boardColumns={statesData.states}
          allResourcesByType={allResourcesByType}
          fpStartRef={fpStartRef}
          fpConstraintRef={fpConstraintRef}
          choicesTypeRef={choicesTypeRef}
          choicesPriorityRef={choicesPriorityRef}
          choicesConstraintRef={choicesConstraintRef}
          choicesParentRef={choicesParentRef}
          setShowTaskModal={setShowTaskModal}
          handleTaskSubmit={handleTaskSubmit}
          openCreateSubtask={(parentPublicId) => {
            const parent = tasks.find((t) => t.publicId === parentPublicId);
            openCreateTask(parent?.id ?? 0, undefined, parentPublicId);
          }}
          openEditTaskFromSubtask={(t) => openEditTask(t)}
        />
      )}

      {/* Offcanvas: gestão de Estados (colunas) — acessível do Planning */}
      {showStatesManager && (
        <StatesManagerPanel
          open={showStatesManager}
          states={statesData.states}
          canManage={canDo(ProjectAction.STATE_MANAGE)}
          onClose={() => setShowStatesManager(false)}
          onCreateState={() => { setEditingState(null); setShowStateModal(true); }}
          onEditState={(s) => { setEditingState(s); setShowStateModal(true); }}
          onDeleteState={(s) => { setDeletingState(s); setShowDeleteStateModal(true); }}
          onReorderStates={(ids) => statesData.reorderStates(ids)}
        />
      )}

      {commentTask && projectId && (
        <CommentTaskModal projectId={projectId} commentTask={commentTask} setCommentTask={setCommentTask} />
      )}

      {showDeleteTask && deletingTask && (
        <DeleteTaskModal
          deletingTask={deletingTask}
          deleteTaskLoading={deleteTaskLoading}
          setShowDeleteTask={setShowDeleteTask}
          handleDeleteTask={handleDeleteTask}
        />
      )}

      {showLinkModal && (
        <LinkModal
          tasks={tasks}
          linkForm={linkForm}
          setLinkForm={setLinkForm}
          linkFormError={linkFormError}
          linkFormLoading={linkFormLoading}
          setShowLinkModal={setShowLinkModal}
          handleLinkSubmit={handleLinkSubmit}
        />
      )}

      {showExtModal && (
        <ExternalResourceModal
          editingExt={editingExt}
          extForm={extForm}
          setExtForm={setExtForm}
          extFormError={extFormError}
          extFormLoading={extFormLoading}
          userTypes={userTypes}
          setShowExtModal={setShowExtModal}
          handleExtSubmit={handleExtSubmit}
        />
      )}

      {showDeleteExt && deletingExt && (
        <DeleteExtModal
          deletingExt={deletingExt}
          deleteExtLoading={deleteExtLoading}
          setShowDeleteExt={setShowDeleteExt}
          handleDeleteExt={handleDeleteExt}
        />
      )}

      {/* ── Modais de Estados ───────────────────────────────────────────────── */}
      {showStateModal && (
        <StateModal
          editingState={editingState}
          onClose={() => { setShowStateModal(false); setEditingState(null); }}
          onCreate={async (label, color, wipLimit) => {
            const ok = await statesData.createState(label, color, wipLimit);
            if (ok) showToast('success', t('states.success.created'));
            return ok;
          }}
          onUpdate={async (statePublicId, patch) => {
            const ok = await statesData.updateState(statePublicId, patch);
            if (ok) showToast('success', t('states.success.updated'));
            return ok;
          }}
        />
      )}

      {showDeleteStateModal && deletingState && (
        <DeleteStateModal
          state={deletingState}
          taskCount={tasks.filter((tk) => tk.boardColumn === deletingState.publicId).length}
          otherStates={statesData.states.filter((s) => s.publicId !== deletingState.publicId)}
          onClose={() => { setShowDeleteStateModal(false); setDeletingState(null); }}
          onDelete={async (statePublicId, targetStatePublicId) => {
            const result = await statesData.deleteState(statePublicId, targetStatePublicId);
            if (result.ok) {
              showToast('success', t('states.success.deleted'));
              await loadAll(); // tasks podem ter sido reatribuídas
            }
            return result;
          }}
        />
      )}

      {/* ── Calendar modals ─────────────────────────────────────────────────── */}
      {showEventModal && (
        <CalendarEventModal
          open={showEventModal}
          event={editingEvent}
          initialRange={pendingEventRange}
          eventTypes={calendarData.data.eventTypes}
          canDelete={canDo(ProjectAction.CALENDAR_EVENT_DELETE)}
          onSave={async (payload) => {
            if (editingEvent) {
              return calendarData.updateEvent(editingEvent.publicId, payload);
            }
            return calendarData.createEvent(payload);
          }}
          onDelete={editingEvent ? async () => calendarData.deleteEvent(editingEvent.publicId) : undefined}
          onClose={() => { setShowEventModal(false); setEditingEvent(null); setPendingEventRange(null); }}
        />
      )}

      <CalendarEventTypesPanel
        open={showEventTypesModal}
        eventTypes={calendarData.data.eventTypes}
        canManage={canDo(ProjectAction.CALENDAR_EVENT_TYPE_MANAGE)}
        onCreate={(name, color) => calendarData.createEventType(name, color)}
        onUpdate={(typePublicId, patch) => calendarData.updateEventType(typePublicId, patch)}
        onDelete={(typePublicId) => calendarData.deleteEventType(typePublicId)}
        onClose={() => setShowEventTypesModal(false)}
      />

      </div>
      {/* /viewWrapperRef */}
    </div>
    </TimezoneProvider>
    </ProjectDateFormatProvider>
  );
}
