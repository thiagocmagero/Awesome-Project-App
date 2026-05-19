// Vista "Lista" do projeto. Estrutura:
//   <ViewActions>      Row 1 (filter + Exportar + Gerenciar + +Adicionar + ⚙ + ⛶)
//   <FilterToolbar>    Row 2 (.lv-subbar: mode-seg + state-pills + groupby + cols-picker)
//   <div .list-wrap>   Conteúdo (listMode=tasks: tabela; else: "Em breve.")
//
// CRUD de tarefas continua diferido. CRUD de Estados via <ManageStatesDrawer>.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EllipsisVertical } from 'lucide-react';

import '../../../styles/project-list.css';
import '../../../styles/project-resources-links.css';

import { ProjectAction as PA } from '../../../hooks/useProjectPermissions';
import { useToast } from '../../../contexts/ToastContext';
import { apiFetch, getApiBase } from '../../../lib/api';
import { resolveStateColor, type IProjectMember, type IResourceNode, type ITask, type ITaskLink, type ITaskState } from '../types';
import type { TaskModalTab } from '../useTaskForm';
import { ViewActions } from './ViewActions';
import { ManageStatesDrawer } from './ManageStatesDrawer';
import { TaskModal } from './TaskModal';
import { FilterToolbar, type ListMode, type StateFilterKey } from './FilterToolbar';
import {
  ALL_COLS, defaultColVisibility, makeSorter,
  type ListColDef, type ListColKey, type SortContext,
} from './list-columns';
import {
  groupTasksByState, groupTasksByAssignee, groupTasksByPriority, groupTasksFlat,
  type GroupBy, type GroupView,
} from './list-grouping';
import { AssigneeAvatars } from './AssigneeAvatars';
import { DateCell } from './DateCell';
import { PriorityBadge } from './PriorityBadge';
import { ProgressCell } from './ProgressCell';
import { TaskCheckbox } from './TaskCheckbox';
import { TypeBadge } from './TypeBadge';
import { ResourcesView } from './ResourcesView';
import { LinksView } from './LinksView';

/** Coluna ordenável — `'task'` é pseudo-coluna especial: ordena a vista
 *  conforme o `groupBy` (em `assignee`/`priority` ordena os grupos pelo
 *  agrupador; em `none` ordena por `task.text`; em `state` é desabilitada). */
export type SortKey = ListColKey | 'task';

export interface SortBy {
  key: SortKey;
  dir: 'asc' | 'desc';
}

interface Props {
  tasks: ITask[];
  links: ITaskLink[];
  resources: IResourceNode[];
  members: IProjectMember[];
  refresh: () => Promise<void>;
  states: ITaskState[];
  membersByPublicId: Map<string, IProjectMember>;
  dateFormat: string | null;
  loading: boolean;
  can: (action: PA) => boolean;
  projectPublicId: string;
  /** Janela útil do projecto — `null` = default 9-18. Usada pelo TaskModal
   *  para validação de start em tasks HOUR. */
  workHours: { start: number; end: number } | null;
  states_create: (label: string, color?: string, wipLimit?: number) => Promise<boolean>;
  states_update: (publicId: string, patch: { label?: string | null; color?: string | null; wipLimit?: number | null }) => Promise<boolean>;
  states_delete: (publicId: string, targetPublicId?: string) => Promise<{ ok: boolean; error?: string }>;
  states_reorder: (orderedPublicIds: string[]) => Promise<boolean>;
}

interface TaskModalOpenState {
  task: ITask | null;
  tab: TaskModalTab;
  parentPublicId?: string;
  boardColumnPublicId?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_PT_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatCreatedShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = MONTH_PT_SHORT[d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd} ${mm} ${hh}:${mi}`;
}

function resolveStateLabel(state: ITaskState, t: (k: string) => string): string {
  if (state.label) return state.label;
  if (state.labelKey) return t(state.labelKey);
  return '—';
}

/** Mapeia estado sistema → tokens canónicos (--st-todo / --st-todoInk etc.) quando
 *  o utilizador NÃO definiu cor custom. Se houver override (`state.color` !== null),
 *  ou para estados custom, cai em transparência (color20 bg + border color40). */
function statusCellStyle(state: ITaskState): { background: string; color: string; border: string } {
  // User override prevalece (mesmo em estados sistema) — usa transparência consistente
  // com estados custom para que a cor escolhida se note imediatamente.
  if (state.color) {
    return {
      background: `${state.color}20`,
      color: state.color,
      border: `1px solid ${state.color}40`,
    };
  }
  switch (state.systemKey) {
    case 'TODO':
      return { background: 'var(--st-todo)', color: 'var(--st-todoInk)', border: 'none' };
    case 'INPROGRESS':
      return { background: 'var(--st-doing)', color: 'var(--st-doingInk)', border: 'none' };
    case 'DONE':
      return { background: 'var(--st-done)', color: 'var(--st-doneInk)', border: 'none' };
    default: {
      const fallback = resolveStateColor(state);
      return {
        background: `${fallback}20`,
        color: fallback,
        border: `1px solid ${fallback}40`,
      };
    }
  }
}

// ─── Cell render por coluna ──────────────────────────────────────────────────

function renderCell(
  col: ListColDef,
  task: ITask,
  state: ITaskState | undefined,
  membersByPublicId: Map<string, IProjectMember>,
  dateFormat: string | null,
  t: (k: string) => string,
): React.ReactNode {
  switch (col.key) {
    case 'start':
      return <DateCell value={task.start_date} dateFormat={dateFormat} />;
    case 'end':
      return <DateCell value={task.end_date} dateFormat={dateFormat} />;
    case 'duration':
      return (
        <span className="date-cell">
          {typeof task.duration === 'number' ? `${task.duration}d` : '—'}
        </span>
      );
    case 'progress':
      return <ProgressCell progress={task.progress} />;
    case 'priority':
      return <PriorityBadge priority={task.priority} />;
    case 'state': {
      if (!state) return <span className="status-cell">—</span>;
      const style = statusCellStyle(state);
      return (
        <span className="status-cell" style={style}>
          {resolveStateLabel(state, t)}
        </span>
      );
    }
    case 'owner':
      return <AssigneeAvatars ownerIds={task.owner_id} byPublicId={membersByPublicId} />;
    case 'created':
      return (
        <span className="date-cell" style={{ fontSize: 11 }}>
          {formatCreatedShort(task.createdAt)}
        </span>
      );
    case 'type':
      return <TypeBadge type={task.type} />;
    default:
      return <span>—</span>;
  }
}

// ─── Skeleton (loading) ──────────────────────────────────────────────────────

function SkeletonRows({ count = 4, gridTpl }: { count?: number; gridTpl: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="list-dyn-row list-row skeleton" style={{ gridTemplateColumns: gridTpl }}>
          <span className="sk" style={{ width: 14, height: 14, borderRadius: '50%' }} />
          <span className="sk" style={{ width: '60%', display: 'block' }} />
          {Array.from({ length: gridTpl.split(' ').length - 3 }).map((_, j) => (
            <span key={j} className="sk" style={{ width: 50, display: 'block' }} />
          ))}
          <span />
        </div>
      ))}
    </>
  );
}

// ─── ProjectListView (orquestrador) ──────────────────────────────────────────

export function ProjectListView({
  tasks, links, resources, members, refresh,
  states, membersByPublicId, dateFormat, loading, can,
  projectPublicId, workHours,
  states_create, states_update, states_delete, states_reorder,
}: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();
  const [filterText, setFilterText] = useState('');
  const [listMode, setListMode] = useState<ListMode>('tasks');
  const [stateFilter, setStateFilter] = useState<StateFilterKey>('all');
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<ListColKey, boolean>>(defaultColVisibility);
  const [groupBy, setGroupBy] = useState<GroupBy>('state');
  const [sortBy, setSortBy] = useState<SortBy | null>(null);

  // TaskModal — estado de abertura. null = fechado.
  const [taskModalOpen, setTaskModalOpen] = useState<TaskModalOpenState | null>(null);
  // Key bump para forçar re-mount limpo do modal (evita state contaminado entre
  // opens consecutivos, ex: editar task A → +Add subtask → criar com parent A).
  const taskModalKeyRef = useRef(0);

  // Estado pop-up do kebab `.row-more` (Edit / Delete). publicId ou null.
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);

  // Default state para "+ Adicionar Tarefa" no fundo (TODO system ou primeiro).
  const defaultStatePublicId = useMemo(() => {
    const todo = states.find((s) => s.systemKey === 'TODO');
    return todo?.publicId ?? states[0]?.publicId ?? '';
  }, [states]);

  function openCreate(boardColumnPublicId?: string, parentPublicId?: string) {
    taskModalKeyRef.current++;
    setTaskModalOpen({
      task: null,
      tab: 'details',
      boardColumnPublicId: boardColumnPublicId ?? defaultStatePublicId,
      parentPublicId,
    });
  }
  function openEdit(task: ITask, tab: TaskModalTab = 'details') {
    taskModalKeyRef.current++;
    setTaskModalOpen({ task, tab });
  }

  // Listeners de eventos custom emitidos pelo TaskModal (subtask add / edit
  // task via click em sub-row, link source/target, etc.).
  useEffect(() => {
    function onCreateSubtask(e: Event) {
      const detail = (e as CustomEvent<{ parentPublicId: string }>).detail;
      if (detail?.parentPublicId) openCreate(undefined, detail.parentPublicId);
    }
    function onEditTask(e: Event) {
      const detail = (e as CustomEvent<{ publicId: string }>).detail;
      if (!detail?.publicId) return;
      const tk = tasks.find((x) => x.publicId === detail.publicId);
      if (tk) openEdit(tk);
    }
    window.addEventListener('awp:open-create-subtask', onCreateSubtask);
    window.addEventListener('awp:open-edit-task', onEditTask);
    return () => {
      window.removeEventListener('awp:open-create-subtask', onCreateSubtask);
      window.removeEventListener('awp:open-edit-task', onEditTask);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, defaultStatePublicId]);

  // Toggle done — chama PATCH /state com `DONE` system (ou `TODO` para reverter).
  async function toggleDone(task: ITask, done: boolean) {
    const target = states.find((s) => s.systemKey === (done ? 'DONE' : 'TODO'));
    if (!target) {
      showToast('warning', t('task.error_no_system_state'));
      return;
    }
    try {
      const res = await apiFetch(
        `${getApiBase()}/projects/${projectPublicId}/planning/tasks/${task.publicId}/state`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stateId: target.publicId, position: 999999 }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    } catch (e) {
      showToast('danger', e instanceof Error ? e.message : tc('errors.generic'));
    }
  }

  // Close row menu on click outside.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.tm-more-menu') && !target.closest('.list-dyn-row .row-more')) {
        setOpenRowMenu(null);
      }
    }
    if (openRowMenu) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openRowMenu]);

  const visCols = useMemo<ListColDef[]>(
    () => ALL_COLS.filter((c) => visibleCols[c.key]),
    [visibleCols],
  );

  // Coluna TAREFA usa `minmax(180px, 1fr)` em vez de `1fr` para garantir
  // largura mínima de 180px mesmo quando a soma das colunas fixas excede
  // o viewport (caso típico em mobile/tablet). Com `1fr` puro, o CSS Grid
  // encolhe a coluna a 0 quando as fixas não cabem — title fica invisível
  // e não-clicável. Com `minmax`, o grid total fica wider que o viewport
  // e activa o scroll horizontal naturalmente.
  const gridTpl = useMemo(
    () => `28px minmax(180px, 1fr) ${visCols.map((c) => c.width).join(' ')} 36px`,
    [visCols],
  );

  // Contagem por estado (sem filtros de UI — para pills mostrarem total real).
  const countsByState = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tasks) {
      if (t.boardColumn) m[t.boardColumn] = (m[t.boardColumn] ?? 0) + 1;
    }
    return m;
  }, [tasks]);

  // Aplicar filtros: text + state pill.
  const filteredTasks = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return tasks.filter((task) => {
      if (q && !(task.text ?? '').toLowerCase().includes(q)) return false;
      if (stateFilter !== 'all' && task.boardColumn !== stateFilter) return false;
      return true;
    });
  }, [tasks, filterText, stateFilter]);

  /** Map indexado por publicId para sort/lookup rápido. */
  const statesByPublicId = useMemo<Map<string, ITaskState>>(
    () => new Map(states.map((s) => [s.publicId, s])),
    [states],
  );

  /** Ordenação aplicada às tasks ANTES do agrupamento.
   *  Casos especiais para `sortBy.key === 'task'`:
   *    - `groupBy === 'none'`: ordena tasks por `task.text`.
   *    - `groupBy === 'assignee' | 'priority'`: o sort vai para os GRUPOS
   *      (via `groupOrder` abaixo); aqui devolvemos as tasks intactas.
   *    - `groupBy === 'state'`: não acontece (header TAREFA fica disabled). */
  const sortedTasks = useMemo<ITask[]>(() => {
    if (!sortBy) return filteredTasks;
    if (sortBy.key === 'task') {
      if (groupBy === 'none') {
        const mult = sortBy.dir === 'asc' ? 1 : -1;
        return [...filteredTasks].sort((a, b) =>
          mult * (a.text ?? '').toLowerCase().localeCompare((b.text ?? '').toLowerCase()),
        );
      }
      return filteredTasks;
    }
    const ctx: SortContext = { membersByPublicId, statesByPublicId };
    const comp = makeSorter(sortBy.key, sortBy.dir, ctx);
    return [...filteredTasks].sort(comp);
  }, [filteredTasks, sortBy, groupBy, membersByPublicId, statesByPublicId]);

  /** Agrupamento — 4 modos. `state` respeita o filtro de state pill;
   *  outros modos ignoram-no (o agrupamento por X não combina com filtro por
   *  state — UX semelhante a Asana).
   *  `groupOrder` ⬅ activo só quando `sortBy.key === 'task'` em modos
   *  `assignee`/`priority` (re-ordena os grupos pela coluna agrupadora). */
  const groups = useMemo<GroupView[]>(() => {
    const groupOrder: 'asc' | 'desc' | undefined =
      (sortBy?.key === 'task' && (groupBy === 'assignee' || groupBy === 'priority'))
        ? sortBy.dir
        : undefined;
    if (groupBy === 'state') {
      const all = groupTasksByState(sortedTasks, states, (s) => resolveStateLabel(s, t));
      if (stateFilter === 'all') return all;
      return all.filter((g) => g.state?.publicId === stateFilter);
    }
    if (groupBy === 'assignee') {
      return groupTasksByAssignee(
        sortedTasks, membersByPublicId, t('list.group.no_assignee'), { groupOrder },
      );
    }
    if (groupBy === 'priority') {
      return groupTasksByPriority(
        sortedTasks, (k) => t(`list.group.${k}`), t('list.group.no_priority'), { groupOrder },
      );
    }
    return groupTasksFlat(sortedTasks);
  }, [groupBy, sortedTasks, states, stateFilter, membersByPublicId, t, sortBy]);

  const filterActive = filterText.trim().length > 0 || stateFilter !== 'all';

  // Counts dos sub-tabs (Tasks / Resources / Links). Resources = team members
  // + externals (recursos não-grupo). Tasks count vem do array completo
  // (sem filtros de UI — apenas o segmento mode-seg conta global).
  const externalsCount = useMemo(
    () => resources.filter((r) => !r.isGroup && !r.userPublicId).length,
    [resources],
  );
  const resourcesCount = members.length + externalsCount;
  const linksCount = links.length;

  function toggleGroup(publicId: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  function toggleCol(key: ListColKey, next: boolean) {
    setVisibleCols((prev) => ({ ...prev, [key]: next }));
  }
  function selectAllCols() {
    const next: Record<ListColKey, boolean> = {} as Record<ListColKey, boolean>;
    for (const c of ALL_COLS) next[c.key] = true;
    setVisibleCols(next);
  }

  /** Click no header: 1º asc → 2º desc → 3º limpar. Aceita 'task' (pseudo-coluna). */
  function toggleSort(key: SortKey) {
    setSortBy((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  return (
    <>
      <ViewActions
        filterText={filterText}
        onFilterChange={setFilterText}
        onOpenManageStates={() => setDrawerOpen(true)}
        onCreateTask={() => openCreate()}
        can={can}
      />

      <FilterToolbar
        tasksCount={tasks.length}
        resourcesCount={resourcesCount}
        linksCount={linksCount}
        states={states}
        countsByState={countsByState}
        listMode={listMode}
        onListModeChange={setListMode}
        stateFilter={stateFilter}
        onStateFilterChange={setStateFilter}
        visibleCols={visibleCols}
        onToggleCol={toggleCol}
        onSelectAllCols={selectAllCols}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      {listMode === 'resources' && (
        <ResourcesView
          members={members}
          resources={resources}
          projectPublicId={projectPublicId}
          refresh={refresh}
          can={can}
        />
      )}

      {listMode === 'links' && (
        <LinksView
          links={links}
          tasks={tasks}
          projectPublicId={projectPublicId}
          refresh={refresh}
          can={can}
        />
      )}

      {listMode === 'tasks' && (
        <div className="list-wrap">
            {/* Header de colunas dinâmico — colunas clicáveis para sort.
                Coluna TAREFA é pseudo-sortable: em groupBy='state' fica
                disabled; em outros modos ordena os grupos (assignee/priority)
                ou as tasks (none) pelo nome/severidade/texto. */}
            <div className="list-dyn-head" style={{ gridTemplateColumns: gridTpl }}>
              <span />
              {(() => {
                const taskSortable = groupBy !== 'state';
                const isSorted = sortBy?.key === 'task';
                const dir = isSorted ? sortBy!.dir : null;
                return (
                  <button
                    type="button"
                    className={'sort-header' + (isSorted ? ' active' : '') + (taskSortable ? '' : ' disabled')}
                    onClick={taskSortable ? () => toggleSort('task') : undefined}
                    disabled={!taskSortable}
                  >
                    <span>{t('table.task')}</span>
                    <span className={'sort-ind' + (isSorted ? ' on' : '')}>
                      {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕'}
                    </span>
                  </button>
                );
              })()}
              {visCols.map((c) => {
                const sortable = c.sortable !== false;
                const isSorted = sortBy?.key === c.key;
                const dir = isSorted ? sortBy!.dir : null;
                return (
                  <button
                    key={c.key}
                    type="button"
                    className={'sort-header' + (isSorted ? ' active' : '') + (sortable ? '' : ' disabled')}
                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                    disabled={!sortable}
                  >
                    <span>{t(c.labelKey)}</span>
                    <span className={'sort-ind' + (isSorted ? ' on' : '')}>
                      {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕'}
                    </span>
                  </button>
                );
              })}
              <span />
            </div>

            {loading && states.length === 0 ? (
              <SkeletonRows count={4} gridTpl={gridTpl} />
            ) : groups.length === 0 ? (
              <div className="list-empty-group">
                {filterActive ? t('list.empty_filter') : t('task.empty')}
              </div>
            ) : (
              groups.map((group) => {
                const isClosed = collapsedKeys.has(group.key);
                const isDone = group.done ?? false;
                // "+ Adicionar tarefa" inline só faz sentido quando estamos
                // a agrupar por estado (associa a task ao estado do grupo).
                const canAdd = can(PA.TASK_CREATE) && groupBy === 'state';
                const showHeader = group.label !== null;
                return (
                  <div key={group.key}>
                    {showHeader && (
                      <div
                        className={`list-group${isClosed ? ' closed' : ''}`}
                        onClick={() => toggleGroup(group.key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleGroup(group.key); }}
                      >
                        <span className="chev">▼</span>
                        {group.color && <span className="swatch" style={{ background: group.color }} />}
                        <span className="name">{group.label}</span>
                        <span className="count">{group.tasks.length}</span>
                        {canAdd && (
                          <button
                            type="button"
                            className="add"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCreate(group.state?.publicId);
                            }}
                          >{t('list.add_task_inline')}</button>
                        )}
                      </div>
                    )}
                    {!isClosed && (
                      group.tasks.length === 0 ? (
                        <div className="list-empty-group">
                          {filterActive ? t('list.empty_filter') : t('list.empty_group')}
                        </div>
                      ) : (
                        group.tasks.map((task) => {
                          // Quando groupBy='state', usa o state do grupo.
                          // Quando 'assignee'/'priority'/'none', resolve via lookup.
                          const taskState = group.state
                            ?? (task.boardColumn ? statesByPublicId.get(task.boardColumn) : undefined);
                          // Key inclui `group.key` porque uma task pode
                          // aparecer em múltiplos grupos (groupBy='assignee'
                          // com múltiplos owners) — `task.publicId` sozinho
                          // colidiria no DOM.
                          return (
                            <div
                              key={`${group.key}::${task.publicId}`}
                              className={`list-dyn-row${isDone ? ' done' : ''}`}
                              style={{ gridTemplateColumns: gridTpl, position: 'relative' }}
                            >
                              <span>
                                <TaskCheckbox
                                  done={isDone}
                                  disabled={!can(PA.TASK_EDIT)}
                                  onChange={(next) => void toggleDone(task, next)}
                                />
                              </span>
                              <span
                                className="title"
                                role="button"
                                tabIndex={0}
                                onClick={() => openEdit(task)}
                                onKeyDown={(e) => { if (e.key === 'Enter') openEdit(task); }}
                                style={{ cursor: 'pointer' }}
                              >{task.text}</span>
                              {visCols.map((col) => (
                                <span key={col.key}>
                                  {renderCell(col, task, taskState, membersByPublicId, dateFormat, t)}
                                </span>
                              ))}
                              <button
                                type="button"
                                className="row-more"
                                aria-label={tc('actions.more')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenRowMenu((m) => m === task.publicId ? null : task.publicId);
                                }}
                              ><EllipsisVertical size={16} strokeWidth={2} /></button>
                              {openRowMenu === task.publicId && (
                                <div
                                  className="tm-more-menu"
                                  style={{ right: 'max(12px, env(safe-area-inset-right))', top: '100%', zIndex: 180 }}
                                >
                                  {/* "Ver detalhes" fica sempre disponível — abre o TaskModal em modo
                                      leitura quando o user não tem TASK_EDIT. Garante que mobile/Reader
                                      nunca veja um menu vazio. */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setOpenRowMenu(null); openEdit(task); }}
                                  >{can(PA.TASK_EDIT) ? tc('actions.edit') : tc('actions.view')}</button>
                                  {can(PA.TASK_DELETE) && (
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={(e) => { e.stopPropagation(); setOpenRowMenu(null); openEdit(task); /* delete via footer no modal */ }}
                                    >{tc('actions.delete')}</button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                );
              })
            )}

            {can(PA.TASK_CREATE) && (
              <button
                type="button"
                className="add-task-bar"
                onClick={() => openCreate()}
              >
                <span className="icon">+</span>
                <span>{t('list.add_task_inline')}…</span>
              </button>
            )}
        </div>
      )}

      {drawerOpen && (
        <ManageStatesDrawer
          states={states}
          tasks={tasks}
          projectPublicId={projectPublicId}
          onClose={() => setDrawerOpen(false)}
          onCreate={states_create}
          onUpdate={states_update}
          onDelete={states_delete}
          onReorder={states_reorder}
        />
      )}

      {taskModalOpen && (
        <TaskModal
          key={taskModalKeyRef.current}
          projectPublicId={projectPublicId}
          initialValue={taskModalOpen.task}
          initialTab={taskModalOpen.tab}
          parentPublicId={taskModalOpen.parentPublicId}
          boardColumnPublicId={taskModalOpen.boardColumnPublicId}
          states={states}
          tasks={tasks}
          links={links}
          assigneesByPublicId={membersByPublicId}
          workHours={workHours}
          can={can}
          onClose={() => setTaskModalOpen(null)}
          onMutated={refresh}
        />
      )}
    </>
  );
}
