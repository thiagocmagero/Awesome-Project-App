import type { RefObject, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import CommentsPanel from '../../../components/CommentsPanel';
import { FilesPanel } from '../../files/components/FilesPanel';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import {
  ProjectAction,
  useProjectPermissions,
} from '../../../hooks/useProjectPermissions';
import { TASK_TYPES, PRIORITY_OPTIONS, CONSTRAINT_OPTIONS, CONSTRAINT_NEEDS_DATE } from '../types';
import type { GanttTask } from '../types';
import type { ITaskState } from '../states-types';

export interface TaskModalProps {
  projectId: string | undefined;
  editingTask: GanttTask | null;
  taskModalTab: 'details' | 'comments' | 'links' | 'files';
  setTaskModalTab: (tab: 'details' | 'comments' | 'links' | 'files') => void;
  /** Links onde a task é source ou target (subset filtrado pelo orchestrator). */
  taskLinks?: Array<{ id: string | number; publicId: string; source: number; target: number; type: string }>;
  /** Lookup auxiliar para mostrar texto da task source/target. */
  tasksById?: Map<number, { publicId: string; text: string }>;
  /** Handler para remover um link a partir do modal. */
  onRemoveLink?: (linkPublicId: string) => void;
  taskForm: {
    text: string; type: string; start_date: string; duration: string;
    durationUnit: 'DAY' | 'HOUR';
    progress: string; parent: string; priority: string;
    constraint_type: string; constraint_date: string; boardColumn: string;
    parentPublicId: string;
  };
  setTaskForm: (form: TaskModalProps['taskForm']) => void;
  taskFormError: string;
  taskFormLoading: boolean;
  tasks: GanttTask[];
  boardColumns: ITaskState[];
  allResourcesByType: Map<string, { label: string; items: Array<{ id: string; name: string }> }>;
  // DOM refs for FlatPickr / Choices (managed by orchestrator effects)
  fpStartRef: RefObject<HTMLInputElement>;
  fpConstraintRef: RefObject<HTMLInputElement>;
  choicesTypeRef: RefObject<HTMLSelectElement>;
  choicesPriorityRef: RefObject<HTMLSelectElement>;
  choicesConstraintRef: RefObject<HTMLSelectElement>;
  choicesParentRef: RefObject<HTMLSelectElement>;
  choicesStateRef: RefObject<HTMLSelectElement>;
  choicesOwnerRef: RefObject<HTMLSelectElement>;
  setShowTaskModal: (v: boolean) => void;
  handleTaskSubmit: (e: FormEvent) => Promise<void>;
}

export function TaskModal({
  projectId, editingTask, taskModalTab, setTaskModalTab,
  taskLinks, tasksById, onRemoveLink,
  taskForm, setTaskForm, taskFormError, taskFormLoading,
  tasks, boardColumns, allResourcesByType,
  fpStartRef, fpConstraintRef,
  choicesTypeRef, choicesPriorityRef, choicesConstraintRef,
  choicesParentRef, choicesStateRef, choicesOwnerRef,
  setShowTaskModal, handleTaskSubmit,
}: TaskModalProps) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const { t: tf } = useTranslation('files');

  // Tab "Ficheiros" — gated por flag `upload` e permissão FILE_VIEW.
  const { enabled: uploadFlagEnabled } = useFeatureFlag('upload', projectId ?? null);
  const { can: canDoProject } = useProjectPermissions(projectId);
  const showFilesTab = uploadFlagEnabled && canDoProject(ProjectAction.FILE_VIEW);

  const resolveColumnLabel = (col: ITaskState): string => {
    if (col.label) return col.label;
    if (col.labelKey) return t(col.labelKey as Parameters<typeof t>[0]);
    return col.publicId;
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {editingTask ? t('task.modal_edit_title') : t('task.modal_create_title')}
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowTaskModal(false)} />
            </div>
            {/* Tab nav — only visible when editing existing task. Tab Style-2 do template
                Zynix (nav-tabs tab-style-2 nav-justified). */}
            {editingTask && (
              <div className="px-3 pt-3">
                <ul className="nav nav-tabs tab-style-2 nav-justified mb-3 d-sm-flex d-block" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      type="button"
                      className={`nav-link${taskModalTab === 'details' ? ' active' : ''}`}
                      onClick={() => setTaskModalTab('details')}
                    >
                      <i className="ri-file-list-3-line me-1 align-middle" />
                      {t('task.form.tab_details')}
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      type="button"
                      className={`nav-link${taskModalTab === 'comments' ? ' active' : ''}`}
                      onClick={() => setTaskModalTab('comments')}
                    >
                      <i className="ri-chat-3-line me-1 align-middle" />
                      {t('task.form.tab_comments')}
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      type="button"
                      className={`nav-link${taskModalTab === 'links' ? ' active' : ''}`}
                      onClick={() => setTaskModalTab('links')}
                    >
                      <i className="ri-link me-1 align-middle" />
                      {t('task.form.tab_links')}
                    </button>
                  </li>
                  {showFilesTab && (
                    <li className="nav-item" role="presentation">
                      <button
                        type="button"
                        className={`nav-link${taskModalTab === 'files' ? ' active' : ''}`}
                        onClick={() => setTaskModalTab('files')}
                      >
                        <i className="ri-attachment-2 me-1 align-middle" />
                        {tf('page.tab_label')}
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {/* Files tab */}
            {taskModalTab === 'files' && editingTask && projectId && (
              <div className="modal-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
                <FilesPanel
                  projectPublicId={projectId}
                  taskPublicId={editingTask.publicId}
                  enabled
                />
              </div>
            )}
            {/* Comments tab */}
            {taskModalTab === 'comments' && editingTask && projectId && (
              <div className="modal-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
                <CommentsPanel
                  projectId={projectId}
                  entityType="TASK"
                  entityPublicId={editingTask.publicId}
                />
              </div>
            )}
            {/* Links tab — vínculos onde a task é source ou target. Acção: remover. */}
            {taskModalTab === 'links' && editingTask && (
              <div className="modal-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
                {(() => {
                  const links = (taskLinks ?? []).filter(
                    (l) => l.source === editingTask.id || l.target === editingTask.id,
                  );
                  if (links.length === 0) {
                    return (
                      <div className="text-center text-muted py-4">
                        <i className="ri-link-unlink fs-24 d-block mb-2" />
                        {t('task.links.empty')}
                      </div>
                    );
                  }
                  const linkTypeLabel = (typ: string): string => {
                    switch (typ) {
                      case '0': return t('task.links.type.fs');
                      case '1': return t('task.links.type.ss');
                      case '2': return t('task.links.type.ff');
                      case '3': return t('task.links.type.sf');
                      default:  return typ;
                    }
                  };
                  const taskLabel = (id: number): string => {
                    if (id === editingTask.id) return t('task.links.this_task');
                    return tasksById?.get(id)?.text ?? `#${id}`;
                  };
                  return (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>{t('task.links.col_source')}</th>
                            <th>{t('task.links.col_target')}</th>
                            <th>{t('task.links.col_type')}</th>
                            <th className="text-end">{tc('actions.delete')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {links.map((l) => (
                            <tr key={l.publicId}>
                              <td>{taskLabel(l.source)}</td>
                              <td>{taskLabel(l.target)}</td>
                              <td><span className="badge bg-light text-dark">{linkTypeLabel(l.type)}</span></td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-icon btn-danger-light"
                                  title={tc('actions.delete')}
                                  onClick={() => onRemoveLink?.(l.publicId)}
                                >
                                  <i className="ri-delete-bin-line" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
            {/* Details tab — sempre montado (display:none quando inactivo) para
                preservar instâncias Choices.js e FlatPickr nos refs (sem isto,
                trocar para Comments/Links e voltar perde os widgets). */}
            <div style={{ display: taskModalTab === 'details' ? '' : 'none' }}>
              <form onSubmit={handleTaskSubmit}>
                <div className="modal-body">
                  {taskFormError && (
                    <div className="alert alert-danger py-2">{taskFormError}</div>
                  )}
                  <div className="row gy-3">

                    {/* Texto */}
                    <div className="col-12">
                      <label className="form-label">{t('task.form.text_label')} <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        value={taskForm.text}
                        onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                        required
                      />
                    </div>

                    {/* Tipo */}
                    <div className="col-md-4">
                      <label className="form-label">{t('task.form.type_label')}</label>
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
                            {t((o.value === 'milestone' ? 'task.type.milestone_label' : `task.type.${o.value}`) as Parameters<typeof t>[0])}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Data de início — FlatPickr */}
                    <div className="col-md-4">
                      <label className="form-label">{t('task.form.start_date_label')} <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <div className="input-group-text text-muted">
                          <i className="ri-calendar-line" />
                        </div>
                        <input
                          ref={fpStartRef}
                          type="text"
                          className="form-control"
                          placeholder="DD-MM-YYYY HH:mm"
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Duração — oculta para marcos. Label e step variam com durationUnit. */}
                    <div className="col-md-4" style={{ display: taskForm.type === 'milestone' ? 'none' : '' }}>
                      <label className="form-label">
                        {taskForm.durationUnit === 'HOUR'
                          ? t('task.duration_hours_label')
                          : t('task.duration_days_label')}
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

                    {/* Toggle Definir hora exacta — alterna durationUnit DAY ↔ HOUR.
                        Quando HOUR, o utilizador deve introduzir a hora no FlatPickr
                        e a duração passa a ser em horas (com snap 0.25 = 15min).
                        Para tasks DAY o backend usa addBusinessDaysInclusive; para
                        HOUR usa addBusinessHoursInclusive com Project.workHours.
                        Ver docs/claude/tools/gantt/data-model.md. */}
                    <div className="col-md-4" style={{ display: taskForm.type === 'milestone' ? 'none' : '' }}>
                      <label className="form-label d-block">&nbsp;</label>
                      <div className="form-check form-switch mt-1">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="task-duration-unit-toggle"
                          checked={taskForm.durationUnit === 'HOUR'}
                          onChange={(e) => setTaskForm({
                            ...taskForm,
                            durationUnit: e.target.checked ? 'HOUR' : 'DAY',
                          })}
                        />
                        <label className="form-check-label" htmlFor="task-duration-unit-toggle">
                          {t('task.duration_unit_toggle')}
                        </label>
                      </div>
                      <small className="text-muted d-block mt-1" style={{ fontSize: 11 }}>
                        {t('task.duration_unit_hint')}
                      </small>
                    </div>


                    {/* Progresso — oculto para marcos */}
                    <div className="col-md-4" style={{ display: taskForm.type === 'milestone' ? 'none' : '' }}>
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

                    {/* Estado — coluna do board (source of truth). Oculto para agrupadores e marcos. */}
                    <div className="col-md-4" style={{ display: taskForm.type === 'project' || taskForm.type === 'milestone' ? 'none' : '' }}>
                      <label className="form-label">{t('task.form.state_label')}</label>
                      <select
                        ref={choicesStateRef}
                        className="form-control"
                        value={taskForm.boardColumn}
                        onChange={(e) => setTaskForm({ ...taskForm, boardColumn: e.target.value })}
                      >
                        {boardColumns.map((col) => (
                          <option key={col.publicId} value={col.publicId}>{resolveColumnLabel(col)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tarefa pai */}
                    <div className="col-md-4">
                      <label className="form-label">
                        {t('task.form.parent_label')} {taskForm.type === 'milestone' && <span className="text-danger">*</span>}
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

                    {/* Prioridade — oculta para marcos */}
                    <div className="col-md-4" style={{ display: taskForm.type === 'milestone' ? 'none' : '' }}>
                      <label className="form-label">{t('task.form.priority_label')}</label>
                      <select
                        ref={choicesPriorityRef}
                        className="form-control"
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      >
                        {PRIORITY_OPTIONS.map((o) => {
                          const pKey = ({ '': 'task.priority.none', '0': 'task.priority.critical', '1': 'task.priority.high', '2': 'task.priority.medium', '3': 'task.priority.low' } as Record<string, string>)[o.value] ?? 'task.priority.none';
                          return <option key={o.value} value={o.value}>{t(pKey as Parameters<typeof t>[0])}</option>;
                        })}
                      </select>
                    </div>

                    {/* Responsáveis — ocultos para marcos */}
                    <div className="col-12" style={{ display: taskForm.type === 'milestone' ? 'none' : '' }}>
                      <label className="form-label">{t('task.form.owners_label')}</label>
                      {allResourcesByType.size === 0 ? (
                        <div className="alert alert-warning py-2 mb-0 fs-13">
                          <i className="ri-information-line me-1" />
                          {t('task.form.no_resources_warning')}
                        </div>
                      ) : (
                        <select
                          ref={choicesOwnerRef}
                          className="form-control"
                          multiple
                        >
                          {Array.from(allResourcesByType.entries()).map(([code, group]) => (
                            <optgroup key={code} label={group.label}>
                              {group.items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Restrição — oculta para marcos */}
                    <div className="col-md-6" style={{ display: taskForm.type === 'milestone' ? 'none' : '' }}>
                      <label className="form-label">{t('task.form.constraint_label')}</label>
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
                            {o.value === '' ? t('constraint.none') : t(`constraint.${o.value}` as Parameters<typeof t>[0])}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Data da restrição — FlatPickr (condicional, oculta para marcos) */}
                    {CONSTRAINT_NEEDS_DATE.has(taskForm.constraint_type) && taskForm.type !== 'milestone' && (
                      <div className="col-md-6">
                        <label className="form-label">
                          {t('task.form.constraint_date_label')} <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <div className="input-group-text text-muted">
                            <i className="ri-calendar-line" />
                          </div>
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
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowTaskModal(false)}>
                    {tc('actions.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={taskFormLoading}>
                    {taskFormLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" />{tc('messages.saving')}</>
                      : editingTask
                        ? tc('actions.save')
                        : taskForm.type === 'milestone' ? t('task.btn_create_milestone') : t('task.btn_create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

// ── CommentTaskModal ──────────────────────────────────────────────────────────

export interface CommentTaskModalProps {
  projectId: string;
  commentTask: { publicId: string; name: string };
  setCommentTask: (v: { publicId: string; name: string } | null) => void;
}

export function CommentTaskModal({ projectId, commentTask, setCommentTask }: CommentTaskModalProps) {
  const { t } = useTranslation('planning');
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="ri-chat-3-line me-2 text-primary" />
                {t('task.comments_modal_title', { name: commentTask.name })}
              </h5>
              <button type="button" className="btn-close" onClick={() => setCommentTask(null)} />
            </div>
            <div className="modal-body" style={{ maxHeight: 520, overflowY: 'auto' }}>
              <CommentsPanel
                projectId={projectId}
                entityType="TASK"
                entityPublicId={commentTask.publicId}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}

// ── DeleteTaskModal ───────────────────────────────────────────────────────────

export interface DeleteTaskModalProps {
  deletingTask: GanttTask;
  deleteTaskLoading: boolean;
  setShowDeleteTask: (v: boolean) => void;
  handleDeleteTask: () => Promise<void>;
}

export function DeleteTaskModal({ deletingTask, deleteTaskLoading, setShowDeleteTask, handleDeleteTask }: DeleteTaskModalProps) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-danger">{t('task.delete_title')}</h5>
              <button type="button" className="btn-close" onClick={() => setShowDeleteTask(false)} />
            </div>
            <div className="modal-body">
              <p>{t('task.delete_confirm', { name: deletingTask.text })}</p>
              <div className="alert alert-warning py-2 mb-0">
                <i className="ri-alert-line me-1" />
                {t('task.delete_warning')}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-light" onClick={() => setShowDeleteTask(false)}>
                {tc('actions.cancel')}
              </button>
              <button className="btn btn-danger" disabled={deleteTaskLoading} onClick={handleDeleteTask}>
                {deleteTaskLoading
                  ? <><span className="spinner-border spinner-border-sm me-2" />{tc('messages.processing')}</>
                  : tc('actions.delete')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
