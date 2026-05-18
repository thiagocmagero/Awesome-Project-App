// Vista "Lista" do projeto. Estrutura:
//   <ViewActions>      Row 1 (filter + Exportar + Gerenciar + +Adicionar + ⚙ + ⛶)
//   <FilterToolbar>    Row 2 (.lv-subbar: mode-seg + state-pills + groupby + cols-picker)
//   <div .list-wrap>   Conteúdo (listMode=tasks: tabela; else: "Em breve.")
//
// CRUD de tarefas continua diferido. CRUD de Estados via <ManageStatesDrawer>.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import '../../../styles/project-list.css';

import { ProjectAction as PA } from '../../../hooks/useProjectPermissions';
import type { IProjectMember, ITask, ITaskState } from '../types';
import { ViewActions } from './ViewActions';
import { ManageStatesDrawer } from './ManageStatesDrawer';
import { FilterToolbar, type ListMode, type StateFilterKey } from './FilterToolbar';
import { ALL_COLS, defaultColVisibility, type ListColDef, type ListColKey } from './list-columns';
import { AssigneeAvatars } from './AssigneeAvatars';
import { DateCell } from './DateCell';
import { PriorityBadge } from './PriorityBadge';
import { ProgressCell } from './ProgressCell';
import { TaskCheckbox } from './TaskCheckbox';
import { TypeBadge } from './TypeBadge';

interface Props {
  tasks: ITask[];
  states: ITaskState[];
  membersByPublicId: Map<string, IProjectMember>;
  dateFormat: string | null;
  loading: boolean;
  can: (action: PA) => boolean;
  projectPublicId: string;
  states_create: (label: string, color?: string, wipLimit?: number) => Promise<boolean>;
  states_update: (publicId: string, patch: { label?: string | null; color?: string | null; wipLimit?: number | null }) => Promise<boolean>;
  states_delete: (publicId: string, targetPublicId?: string) => Promise<{ ok: boolean; error?: string }>;
  states_reorder: (orderedPublicIds: string[]) => Promise<boolean>;
}

interface GroupView {
  state: ITaskState;
  tasks: ITask[];
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

function groupTasks(tasks: ITask[], states: ITaskState[]): GroupView[] {
  const ordered = [...states].sort((a, b) => a.position - b.position);
  const byState = new Map<string, ITask[]>();
  for (const s of ordered) byState.set(s.publicId, []);
  for (const t of tasks) {
    if (t.boardColumn && byState.has(t.boardColumn)) {
      byState.get(t.boardColumn)!.push(t);
    }
  }
  return ordered.map((state) => ({ state, tasks: byState.get(state.publicId) ?? [] }));
}

function resolveStateLabel(state: ITaskState, t: (k: string) => string): string {
  if (state.label) return state.label;
  if (state.labelKey) return t(state.labelKey);
  return '—';
}

/** Mapeia estado sistema → tokens canónicos (--st-todo / --st-todoInk etc.).
 *  Estados custom (sem systemKey) caem em transparência (color20 bg + border color40). */
function statusCellStyle(state: ITaskState): { background: string; color: string; border: string } {
  const fallbackColor = state.color ?? '#6b7280';
  switch (state.systemKey) {
    case 'TODO':
      return { background: 'var(--st-todo)', color: 'var(--st-todoInk)', border: 'none' };
    case 'INPROGRESS':
      return { background: 'var(--st-doing)', color: 'var(--st-doingInk)', border: 'none' };
    case 'DONE':
      return { background: 'var(--st-done)', color: 'var(--st-doneInk)', border: 'none' };
    default:
      return {
        background: `${fallbackColor}20`,
        color: fallbackColor,
        border: `1px solid ${fallbackColor}40`,
      };
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
  tasks, states, membersByPublicId, dateFormat, loading, can,
  projectPublicId,
  states_create, states_update, states_delete, states_reorder,
}: Props) {
  const { t } = useTranslation('planning');
  const [filterText, setFilterText] = useState('');
  const [listMode, setListMode] = useState<ListMode>('tasks');
  const [stateFilter, setStateFilter] = useState<StateFilterKey>('all');
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<ListColKey, boolean>>(defaultColVisibility);

  const visCols = useMemo<ListColDef[]>(
    () => ALL_COLS.filter((c) => visibleCols[c.key]),
    [visibleCols],
  );

  const gridTpl = useMemo(
    () => `28px 1fr ${visCols.map((c) => c.width).join(' ')} 36px`,
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

  const groups = useMemo<GroupView[]>(() => {
    const all = groupTasks(filteredTasks, states);
    if (stateFilter === 'all') return all;
    return all.filter((g) => g.state.publicId === stateFilter);
  }, [filteredTasks, states, stateFilter]);

  const filterActive = filterText.trim().length > 0 || stateFilter !== 'all';

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

  return (
    <>
      <ViewActions
        filterText={filterText}
        onFilterChange={setFilterText}
        onOpenManageStates={() => setDrawerOpen(true)}
        can={can}
      />

      <FilterToolbar
        tasksCount={tasks.length}
        states={states}
        countsByState={countsByState}
        listMode={listMode}
        onListModeChange={setListMode}
        stateFilter={stateFilter}
        onStateFilterChange={setStateFilter}
        visibleCols={visibleCols}
        onToggleCol={toggleCol}
        onSelectAllCols={selectAllCols}
      />

      <div className="list-wrap">
        {listMode !== 'tasks' ? (
          <div className="list-empty-mode">
            <div className="msg">{t('tabs.coming_soon')}</div>
          </div>
        ) : (
          <>
            {/* Header de colunas dinâmico */}
            <div className="list-dyn-head" style={{ gridTemplateColumns: gridTpl }}>
              <span />
              <span>{t('table.task')}</span>
              {visCols.map((c) => (
                <span key={c.key}>{t(c.labelKey)}</span>
              ))}
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
                const isClosed = collapsedKeys.has(group.state.publicId);
                const isDone = group.state.systemKey === 'DONE' || group.state.type === 'FINAL';
                const canAdd = can(PA.TASK_CREATE);
                return (
                  <div key={group.state.publicId}>
                    <div
                      className={`list-group${isClosed ? ' closed' : ''}`}
                      onClick={() => toggleGroup(group.state.publicId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleGroup(group.state.publicId); }}
                    >
                      <span className="chev">▼</span>
                      <span className="swatch" style={{ background: group.state.color ?? '#6b7280' }} />
                      <span className="name">{resolveStateLabel(group.state, t)}</span>
                      <span className="count">{group.tasks.length}</span>
                      <button
                        type="button"
                        className="add"
                        disabled={!canAdd}
                        onClick={(e) => { e.stopPropagation(); }}
                        title={t('actions.coming_soon_tip')}
                      >{t('list.add_task_inline')}</button>
                    </div>
                    {!isClosed && (
                      group.tasks.length === 0 ? (
                        <div className="list-empty-group">
                          {filterActive ? t('list.empty_filter') : t('list.empty_group')}
                        </div>
                      ) : (
                        group.tasks.map((task) => (
                          <div
                            key={task.publicId}
                            className={`list-dyn-row${isDone ? ' done' : ''}`}
                            style={{ gridTemplateColumns: gridTpl }}
                          >
                            <span>
                              <TaskCheckbox done={isDone} disabled={!can(PA.TASK_EDIT)} />
                            </span>
                            <span className="title">{task.text}</span>
                            {visCols.map((col) => (
                              <span key={col.key}>
                                {renderCell(col, task, group.state, membersByPublicId, dateFormat, t)}
                              </span>
                            ))}
                            <button type="button" className="row-more" disabled aria-label="More">⋯</button>
                          </div>
                        ))
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
                disabled
                title={t('actions.coming_soon_tip')}
              >
                <span className="icon">+</span>
                <span>{t('list.add_task_inline')}…</span>
              </button>
            )}
          </>
        )}
      </div>

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
    </>
  );
}
