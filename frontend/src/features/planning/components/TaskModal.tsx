import { useEffect, useMemo, useRef, useState, type RefObject, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import CommentsPanel from '../../../components/CommentsPanel';
import { FilesListView } from '../../files/components/FilesListView';
import { useFiles } from '../../files/useFiles';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { FeatureKey } from '../../../lib/entitlements';
import {
  ProjectAction,
  useProjectPermissions,
} from '../../../hooks/useProjectPermissions';
import { TaskModalTopbar } from './TaskModalTopbar';
import { TaskModalHeader } from './TaskModalHeader';
import { TaskModalQuickFacts } from './TaskModalQuickFacts';
import { TaskModalTabsBar } from './TaskModalTabsBar';
import { TaskModalDetailsTab } from './TaskModalDetailsTab';
import { TaskModalLinksTab } from './TaskModalLinksTab';
import { TaskModalFooter } from './TaskModalFooter';
import type { Task, EMPTY_TASK_FORM } from '../types';
import type { ITaskState, TaskFieldKey } from '../states-types';
import './task-modal.css';

type TaskFormShape = typeof EMPTY_TASK_FORM;
type TaskTab = 'details' | 'comments' | 'links' | 'files';

export interface TaskModalProps {
  projectId: string | undefined;
  editingTask: Task | null;
  taskModalTab: TaskTab;
  setTaskModalTab: (tab: TaskTab) => void;
  /** Links onde a task é source ou target (subset filtrado pelo orchestrator). */
  taskLinks?: Array<{ id: string | number; publicId: string; source: number; target: number; type: string }>;
  /** Lookup auxiliar para mostrar texto da task source/target. */
  tasksById?: Map<number, { publicId: string; text: string }>;
  /** Handler para remover um link a partir do modal. */
  onRemoveLink?: (linkPublicId: string) => void;
  /** Handler opcional para abrir o modal "Adicionar vínculo" (botão "+ Adicionar vínculo"). */
  onAddLink?: () => void;
  taskForm: TaskFormShape;
  setTaskForm: (form: TaskFormShape) => void;
  taskFormError: string;
  taskFormLoading: boolean;
  /** State dos responsáveis seleccionados (publicIds). */
  taskOwnerIds: string[];
  setTaskOwnerIds: (ids: string[]) => void;
  tasks: Task[];
  boardColumns: ITaskState[];
  allResourcesByType: Map<string, { label: string; items: Array<{ id: string; name: string; avatarUrl: string | null }> }>;
  // DOM refs for FlatPickr / Choices (managed by orchestrator effects)
  fpStartRef: RefObject<HTMLInputElement>;
  fpConstraintRef: RefObject<HTMLInputElement>;
  choicesTypeRef: RefObject<HTMLSelectElement>;
  choicesPriorityRef: RefObject<HTMLSelectElement>;
  choicesConstraintRef: RefObject<HTMLSelectElement>;
  choicesParentRef: RefObject<HTMLSelectElement>;
  setShowTaskModal: (v: boolean) => void;
  handleTaskSubmit: (e: FormEvent) => Promise<void>;
  /** Abrir modal de criação para subtarefa (parent pré-preenchido). */
  openCreateSubtask?: (parentPublicId: string) => void;
  /** Abrir o modal a editar outra tarefa (clique numa subtarefa). */
  openEditTaskFromSubtask?: (task: Task) => void;
  /** Erros de regras de campos obrigatórios do estado destino. */
  fieldRuleErrors?: string[];
  /** Campos obrigatórios do estado destino (para mostrar * nos labels). */
  requiredFields?: Set<TaskFieldKey>;
  /** Limpa a data de início no input FlatPickr + estado React. */
  onClearStartDate?: () => void;
}

export function TaskModal({
  projectId, editingTask, taskModalTab, setTaskModalTab,
  taskLinks, tasksById, onRemoveLink, onAddLink,
  taskForm, setTaskForm, taskFormError, taskFormLoading,
  taskOwnerIds, setTaskOwnerIds,
  tasks, boardColumns, allResourcesByType,
  fpStartRef, fpConstraintRef,
  choicesTypeRef, choicesPriorityRef, choicesConstraintRef,
  choicesParentRef,
  setShowTaskModal, handleTaskSubmit,
  openCreateSubtask, openEditTaskFromSubtask,
  fieldRuleErrors = [], requiredFields = new Set(),
  onClearStartDate,
}: TaskModalProps) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  // ── Permissões / feature flags ───────────────────────────────────────────

  const { enabled: uploadFlagEnabled } = useFeatureFlag(FeatureKey.UPLOAD, projectId ?? null);
  const { can: canDoProject } = useProjectPermissions(projectId);
  const showFilesTab = uploadFlagEnabled && canDoProject(ProjectAction.FILE_VIEW);

  // ── State local UI-only (placeholders até existir schema) ────────────────

  const [isFollowing, setIsFollowing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [followerCount] = useState(4); // mock UI-only
  // `description` vive em taskForm.description (useTaskForm) — persiste no backend.
  const description = taskForm.description ?? '';
  const setDescription = (v: string) => setTaskForm({ ...taskForm, description: v });
  const initialTaskFormRef = useRef<string>('');

  // Reset state UI-only quando muda a task em edição (publicId é a chave estável).
  const editingKey = editingTask?.publicId ?? '__create__';
  useEffect(() => {
    setIsFollowing(false);
    setFullscreen(false);
    setTags([]);
    initialTaskFormRef.current = JSON.stringify(taskForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingKey]);

  // ── Body overflow lock ─────────────────────────────────────────────────

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Close on ESC ───────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (fullscreen) {
          setFullscreen(false);
        } else {
          setShowTaskModal(false);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, setShowTaskModal]);

  // ── Dirty state — para o footer "Alterações não salvas" ──────────────────

  const isDirty = useMemo(() => {
    if (!initialTaskFormRef.current) return false;
    if (taskFormLoading) return false;
    const current = JSON.stringify(taskForm);
    if (current !== initialTaskFormRef.current) return true;
    if (tags.length > 0) return true;
    return false;
  }, [taskForm, tags, taskFormLoading]);

  // ── Contadores no header (Discussão / Arquivos) ──────────────────────────

  // Discussão — `commentCount` vem da resposta do board (tipo Task).
  const commentCount = editingTask?.commentCount ?? 0;

  // Arquivos — fetch lazy via useFiles (só se a task existe e é tab visível).
  const { files: taskFiles } = useFiles({
    projectPublicId: projectId ?? null,
    taskPublicId: editingTask?.publicId ?? null,
    scope: 'all',
    enabled: !!editingTask && !!projectId && showFilesTab,
  });
  const fileCount = taskFiles.length;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const visibleLinks = useMemo(() => {
    if (!editingTask || !taskLinks) return [];
    return taskLinks.filter((l) => l.source === editingTask.id || l.target === editingTask.id);
  }, [taskLinks, editingTask]);

  // ── Render ──────────────────────────────────────────────────────────────

  const isCreate = !editingTask;
  const isMilestoneCreate = isCreate && taskForm.type === 'milestone';

  return (
    <>
      <div className="modal fade show d-block task-backdrop" tabIndex={-1}>
        <div className={`modal-dialog modal-dialog-centered task-modal${fullscreen ? ' task-modal--fullscreen' : ''}`}>
          <div className="modal-content">

            {/* Topbar — apenas no modo edição */}
            {editingTask && (
              <TaskModalTopbar
                editingTask={editingTask}
                isFollowing={isFollowing}
                onToggleFollow={() => setIsFollowing((v) => !v)}
                fullscreen={fullscreen}
                onToggleFullscreen={() => setFullscreen((v) => !v)}
                onClose={() => setShowTaskModal(false)}
              />
            )}

            {/* Em modo criação, header tem que ter botão fechar (sem topbar) */}
            {isCreate && (
              <div className="task-topbar">
                <span className="task-id-badge">
                  <i className="ri-task-line" aria-hidden="true" />
                  {t(taskForm.type === 'milestone' ? 'task.modal_create_milestone_title' : 'task.modal_create_title')}
                </span>
                <span className="task-topbar-spacer" />
                <button
                  type="button"
                  className="task-icon-btn"
                  onClick={() => setShowTaskModal(false)}
                  title={tc('actions.cancel')}
                >
                  <i className="ri-close-line" aria-hidden="true" />
                </button>
              </div>
            )}

            <TaskModalHeader
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              tags={tags}
              setTags={setTags}
              showCounters={!!editingTask}
              counts={{ comments: commentCount, files: fileCount, followers: followerCount }}
              showFilesCounter={showFilesTab}
              onJumpTab={setTaskModalTab}
            />

            {/* Quick facts visíveis em criação E edição (Estado clicável é
                a única forma de definir/mudar estado, já que o select foi
                removido do form). Tabs só em modo edição. */}
            <TaskModalQuickFacts
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              editingTask={editingTask}
              boardColumns={boardColumns}
            />
            {editingTask && (
              <TaskModalTabsBar
                tab={taskModalTab}
                setTab={setTaskModalTab}
                showFilesTab={showFilesTab}
                counts={{
                  comments: commentCount,
                  links: visibleLinks.length,
                  files: fileCount,
                }}
              />
            )}

            {/* Body */}
            <div className="task-body">
              {taskFormError && (
                <div className="alert alert-danger py-2 mb-3">{taskFormError}</div>
              )}
              {fieldRuleErrors.length > 0 && (
                <div className="alert alert-danger py-2 mb-3">
                  <div className="fw-semibold mb-1">{t('states.rules.validation_title')}</div>
                  <ul className="mb-0 ps-3">
                    {fieldRuleErrors.map((err) => <li key={err}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Detalhes — sempre montado para preservar Choices/FlatPickr nos refs */}
              <div style={{ display: taskModalTab === 'details' ? '' : 'none' }}>
                <form
                  id="task-modal-form"
                  onSubmit={handleTaskSubmit}
                  /* hidden submit button para permitir Enter — botão real está no footer */
                >
                  <TaskModalDetailsTab
                    projectId={projectId}
                    editingTask={editingTask}
                    taskForm={taskForm}
                    setTaskForm={setTaskForm}
                    description={description}
                    setDescription={setDescription}
                    taskOwnerIds={taskOwnerIds}
                    setTaskOwnerIds={setTaskOwnerIds}
                    tasks={tasks}
                    boardColumns={boardColumns}
                    allResourcesByType={allResourcesByType}
                    showFilesSidebar={showFilesTab}
                    fpStartRef={fpStartRef}
                    fpConstraintRef={fpConstraintRef}
                    choicesTypeRef={choicesTypeRef}
                    choicesPriorityRef={choicesPriorityRef}
                    choicesConstraintRef={choicesConstraintRef}
                    choicesParentRef={choicesParentRef}
                    onAddSubtask={(parentPublicId) => openCreateSubtask?.(parentPublicId)}
                    onOpenSubtask={(t) => openEditTaskFromSubtask?.(t)}
                    onJumpToFiles={() => setTaskModalTab('files')}
                    requiredFields={requiredFields}
                    onClearStartDate={onClearStartDate}
                  />
                  {/* invisible submit input para Enter no form submeter via footer */}
                  <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
                </form>
              </div>

              {taskModalTab === 'comments' && editingTask && projectId && (
                <CommentsPanel
                  projectId={projectId}
                  entityType="TASK"
                  entityPublicId={editingTask.publicId}
                />
              )}

              {taskModalTab === 'links' && editingTask && (
                <TaskModalLinksTab
                  editingTask={editingTask}
                  links={taskLinks ?? []}
                  tasksById={tasksById}
                  onAddLink={onAddLink}
                  onRemoveLink={onRemoveLink}
                />
              )}

              {taskModalTab === 'files' && editingTask && projectId && showFilesTab && (
                <FilesListView
                  projectPublicId={projectId}
                  taskPublicId={editingTask.publicId}
                  enabled
                />
              )}
            </div>

            <TaskModalFooter
              isDirty={isDirty}
              loading={taskFormLoading}
              isCreate={isCreate}
              isMilestoneCreate={isMilestoneCreate}
              onCancel={() => setShowTaskModal(false)}
              onSave={() => {
                const form = document.getElementById('task-modal-form') as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            />
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
  deletingTask: Task;
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
