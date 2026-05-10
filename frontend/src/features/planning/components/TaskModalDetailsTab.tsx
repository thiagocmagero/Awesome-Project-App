import { useTranslation } from 'react-i18next';
import type { RefObject } from 'react';
import { TaskModalDescriptionField } from './TaskModalDescriptionField';
import { TaskModalSubtasks } from './TaskModalSubtasks';
import { TaskModalAssigneesField } from './TaskModalAssigneesField';
import { TaskModalRecentFiles } from './TaskModalRecentFiles';
import { TaskModalSystemPanel } from './TaskModalSystemPanel';
import { HelpTooltip } from './HelpTooltip';
import {
  TASK_TYPES,
  PRIORITY_OPTIONS,
  CONSTRAINT_OPTIONS,
  CONSTRAINT_NEEDS_DATE,
  type EMPTY_TASK_FORM,
  type Task,
} from '../types';
import type { ITaskState, TaskFieldKey } from '../states-types';

type TaskFormShape = typeof EMPTY_TASK_FORM;

interface Props {
  projectId: string | undefined;
  editingTask: Task | null;
  taskForm: TaskFormShape;
  setTaskForm: (form: TaskFormShape) => void;
  description: string;
  setDescription: (value: string) => void;
  taskOwnerIds: string[];
  setTaskOwnerIds: (ids: string[]) => void;
  tasks: Task[];
  boardColumns: ITaskState[];
  allResourcesByType: Map<string, { label: string; items: Array<{ id: string; name: string; avatarUrl: string | null }> }>;
  showFilesSidebar: boolean;
  fpStartRef: RefObject<HTMLInputElement>;
  fpConstraintRef: RefObject<HTMLInputElement>;
  choicesTypeRef: RefObject<HTMLSelectElement>;
  choicesPriorityRef: RefObject<HTMLSelectElement>;
  choicesConstraintRef: RefObject<HTMLSelectElement>;
  choicesParentRef: RefObject<HTMLSelectElement>;
  onAddSubtask: (parentPublicId: string) => void;
  onOpenSubtask: (task: Task) => void;
  onJumpToFiles: () => void;
  /** Campos obrigatórios pelo estado destino — adiciona `*` no label. */
  requiredFields?: Set<TaskFieldKey>;
  /**
   * Limpa a data de início — invoca `fp.clear()` na instância FlatPickr gerida
   * pelo orchestrator (o input é `readOnly`, sem isto não há forma do user
   * voltar a data vazia depois de seleccionar uma).
   */
  onClearStartDate?: () => void;
}

/**
 * Tab Detalhes — grid 4 colunas (40% / 20% / 20% / 20%).
 *
 * Coluna 1 (40%): Descrição + Subtarefas
 * Coluna 2 (20%): Cronograma (Data início, Duração + Hora exata, Restrição)
 * Coluna 3 (20%): Configuração (Tipo, Tarefa Pai, Prioridade, Progresso)
 * Coluna 4 (20%): Responsáveis + Arquivos recentes + Sistema
 *
 * Estado foi removido do form — agora é clicável directamente nos QuickFacts.
 *
 * Mantém os refs FlatPickr/Choices.js geridos pelo orchestrator (PlanningPage)
 * para todas as dropdowns excepto "Responsáveis" (substituído por
 * TaskModalAssigneesField — chips React puros).
 */
export function TaskModalDetailsTab({
  projectId,
  editingTask,
  taskForm,
  setTaskForm,
  description,
  setDescription,
  taskOwnerIds,
  setTaskOwnerIds,
  tasks,
  boardColumns,
  allResourcesByType,
  showFilesSidebar,
  fpStartRef,
  fpConstraintRef,
  choicesTypeRef,
  choicesPriorityRef,
  choicesConstraintRef,
  choicesParentRef,
  onAddSubtask,
  onOpenSubtask,
  onJumpToFiles,
  requiredFields,
  onClearStartDate,
}: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const isMilestone = taskForm.type === 'milestone';
  const req = requiredFields ?? new Set<TaskFieldKey>();
  const reqMarker = <span className="text-danger ms-1">*</span>;

  return (
    <div className="task-details-grid">

      {/* ─── Coluna 1 (40%) — Descrição + Subtarefas ─── */}
      <div className="task-details-main">
        <TaskModalDescriptionField value={description} onChange={setDescription} required={req.has('description')} />
        {editingTask && (
          <TaskModalSubtasks
            parentTask={editingTask}
            tasks={tasks}
            boardColumns={boardColumns}
            onAddSubtask={onAddSubtask}
            onOpenSubtask={onOpenSubtask}
          />
        )}
      </div>

      {/* ─── Coluna 2 (20%) — Cronograma ─── */}
      <div className="task-details-mid">
        <section className="task-section">
          <h6 className="task-section-title">
            <i className="ri-calendar-event-line" aria-hidden="true" />
            {t('task.section.cronograma')}
          </h6>
          <div className="row gy-3">
            {/* Linha 1: Data de início (full width) */}
            <div className="col-12">
              <label className="form-label">
                {t('task.form.start_date_label')}
                {req.has('schedule') && reqMarker}
              </label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="ri-calendar-line" aria-hidden="true" />
                </span>
                <input
                  ref={fpStartRef}
                  type="text"
                  className="form-control"
                  placeholder="DD-MM-YYYY HH:mm"
                  readOnly
                />
                {taskForm.start_date && onClearStartDate && (
                  <button
                    type="button"
                    className="input-group-text"
                    onClick={onClearStartDate}
                    aria-label={tc('actions.clear')}
                    title={tc('actions.clear')}
                    style={{ cursor: 'pointer', border: 0, background: 'transparent' }}
                  >
                    <i className="ri-close-line text-muted" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Linha 2: Duração + Hora exata (lado a lado, oculta para milestone) */}
            {!isMilestone && (
              <>
                <div className="col-6">
                  <label className="form-label">
                    {taskForm.durationUnit === 'HOUR'
                      ? t('task.duration_hours_label')
                      : t('task.duration_days_label')}
                    {req.has('duration') && reqMarker}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={taskForm.durationUnit === 'HOUR' ? 0.25 : 1}
                    className="form-control"
                    value={taskForm.duration}
                    onChange={(e) => setTaskForm({ ...taskForm, duration: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="task-hour-label" htmlFor="task-duration-unit-toggle">
                    {t('task.duration_unit_short')}
                    <HelpTooltip text={t('task.duration_unit_hint')} variant="primary" placement="top" />
                  </label>
                  <div className="task-hour-switch">
                    <div className="form-check form-switch">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="task-duration-unit-toggle"
                        checked={taskForm.durationUnit === 'HOUR'}
                        onChange={(e) =>
                          setTaskForm({ ...taskForm, durationUnit: e.target.checked ? 'HOUR' : 'DAY' })
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Linha 3: Restrição (full width, oculta para milestone) */}
            {!isMilestone && (
              <div className="col-12">
                <label className="form-label">{t('task.form.constraint_label')}{req.has('restriction') && reqMarker}</label>
                <select
                  ref={choicesConstraintRef}
                  className="form-control"
                  value={taskForm.constraint_type}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, constraint_type: e.target.value, constraint_date: '' })
                  }
                >
                  {CONSTRAINT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.value === '' ? t('constraint.none') : t(`constraint.${o.value}` as never)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Data da restrição (condicional) */}
            {CONSTRAINT_NEEDS_DATE.has(taskForm.constraint_type) && !isMilestone && (
              <div className="col-12">
                <label className="form-label">
                  {t('task.form.constraint_date_label')} <span className="text-danger">*</span>
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="ri-calendar-line" aria-hidden="true" />
                  </span>
                  <input
                    ref={fpConstraintRef}
                    type="text"
                    className="form-control"
                    placeholder="DD-MM-YYYY HH:mm"
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ─── Coluna 3 (20%) — Configuração ─── */}
      <div className="task-details-cfg">
        <section className="task-section">
          <h6 className="task-section-title">
            <i className="ri-settings-3-line" aria-hidden="true" />
            {t('task.section.configuracao')}
          </h6>
          <div className="row gy-3">
            <div className="col-12">
              <label className="form-label">{t('task.form.type_label')}{req.has('type') && reqMarker}</label>
              <select
                ref={choicesTypeRef}
                className="form-control"
                value={taskForm.type}
                onChange={(e) => {
                  const taskType = e.target.value;
                  setTaskForm({
                    ...taskForm,
                    type: taskType,
                    duration: taskType === 'milestone' ? '0' : (taskForm.duration === '0' ? '1' : taskForm.duration),
                  });
                }}
              >
                {TASK_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t((o.value === 'milestone' ? 'task.type.milestone_label' : `task.type.${o.value}`) as never)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">
                {t('task.form.parent_label')} {isMilestone && <span className="text-danger">*</span>}
              </label>
              <select
                ref={choicesParentRef}
                className="form-control"
                value={taskForm.parent}
                onChange={(e) => setTaskForm({ ...taskForm, parent: e.target.value, parentPublicId: '' })}
              >
                <option value="0">{t('task.form.no_parent')}</option>
                {tasks
                  .filter((tk) => tk.type !== 'milestone' && (!editingTask || tk.id !== editingTask.id))
                  .slice()
                  .sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))
                  .map((tk) => (
                    <option key={tk.publicId} value={String(tk.id)}>{tk.text}</option>
                  ))}
              </select>
            </div>
            {!isMilestone && (
              <div className="col-12">
                <label className="form-label">{t('task.form.priority_label')}{req.has('priority') && reqMarker}</label>
                <select
                  ref={choicesPriorityRef}
                  className="form-control"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                >
                  {PRIORITY_OPTIONS.map((o) => {
                    const pKey = (
                      { '': 'task.priority.none', '0': 'task.priority.critical', '1': 'task.priority.high', '2': 'task.priority.medium', '3': 'task.priority.low' } as Record<string, string>
                    )[o.value] ?? 'task.priority.none';
                    return <option key={o.value} value={o.value}>{t(pKey as never)}</option>;
                  })}
                </select>
              </div>
            )}
            {!isMilestone && (
              <div className="col-12">
                <label className="form-label">{t('task.form.progress_label')}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="form-control"
                  value={taskForm.progress}
                  onChange={(e) => setTaskForm({ ...taskForm, progress: e.target.value })}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ─── Coluna 4 (20%) — Responsáveis + Arquivos + Sistema ─── */}
      <aside className="task-details-side">
        {!isMilestone && (
          <section className="task-section">
            <h6 className="task-section-title">
              <i className="ri-team-line" aria-hidden="true" />
              {t('task.assignees.title')}
              {req.has('assignees') && reqMarker}
              {taskOwnerIds.length > 0 && <span className="tab-count">{taskOwnerIds.length}</span>}
            </h6>
            {allResourcesByType.size === 0 ? (
              <div className="alert alert-warning py-2 mb-0 fs-13">
                <i className="ri-information-line me-1" aria-hidden="true" />
                {t('task.form.no_resources_warning')}
              </div>
            ) : (
              <TaskModalAssigneesField
                allResourcesByType={allResourcesByType}
                selectedIds={taskOwnerIds}
                setSelectedIds={setTaskOwnerIds}
              />
            )}
          </section>
        )}

        {editingTask && showFilesSidebar && projectId && (
          <TaskModalRecentFiles
            projectPublicId={projectId}
            taskPublicId={editingTask.publicId}
            enabled={showFilesSidebar}
            onViewAll={onJumpToFiles}
          />
        )}

        {editingTask && <TaskModalSystemPanel task={editingTask} />}
      </aside>
    </div>
  );
}
