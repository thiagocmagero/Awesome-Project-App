// Hook CRUD de tarefas (TaskModal).
// Port adaptado de `frontend/src/features/planning/useTaskForm.ts` (regra 4):
//   - apiPost/apiPut/apiPatch/apiDelete (cookies HttpOnly, sem header Authorization).
//   - Tipos alinhados com `frontend2` (ITask em vez de Task).
//   - `endDateMode` fixo 'inclusive' (default do projecto; switch global vive
//     em sub-fase futura quando vier o ProjectDateFormatContext).
//   - Preserva: validation milestone+parent, state required, HOUR start
//     within workHours, mapping de error_codes para mensagens i18n,
//     PATCH /state quando boardColumn muda.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { apiDelete, apiFetch, apiPatch, apiPost, apiPut, getApiBase } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import {
  EMPTY_TAGS_VALUE,
  tagsValueToPayload,
  type TagsFieldValue,
} from '../tags/components/TagsField';
import { invalidateWorkspaceTagsCache } from '../tags/useWorkspaceTags';
import type { Tag } from '../tags/types';
import type { ITask, ITaskState } from './types';

export interface TaskFormState {
  text: string;
  description: string;
  type: string;                 // 'task' | 'project' | 'milestone'
  start_date: string;           // wire DHTMLX 'DD-MM-YYYY HH:mm' (opcional)
  duration: string;
  durationUnit: 'DAY' | 'HOUR';
  progress: string;             // 0-100 como string (display %)
  parent: string;               // task id numérico DHTMLX-compat ('0' = root)
  parentPublicId: string;       // resolvido quando subtask criada via "+ Add subtask"
  priority: string;             // '' | '0' | '1' | '2' | '3'
  constraint_type: string;
  constraint_date: string;
  boardColumn: string;          // publicId do estado (obrigatório no submit)
}

export const EMPTY_TASK_FORM: TaskFormState = {
  text: '',
  description: '',
  type: 'task',
  start_date: '',
  duration: '1',
  durationUnit: 'DAY',
  progress: '0',
  parent: '0',
  parentPublicId: '',
  priority: '',
  constraint_type: '',
  constraint_date: '',
  boardColumn: '',
};

/** Constraint types que precisam de data (`constraint_date` deve estar
 *  preenchido se o constraint_type for um destes). */
export const CONSTRAINT_NEEDS_DATE = new Set([
  'snet', // start no earlier than
  'snlt', // start no later than
  'fnet', // finish no earlier than
  'fnlt', // finish no later than
]);

interface WorkHours { start: number; end: number }

/** Validação local — start_date HOUR deve cair dentro de workHours do projecto. */
function isStartWithinWorkHours(startStr: string, wh: WorkHours | null): boolean {
  if (!wh) return true;
  // Wire DHTMLX: 'DD-MM-YYYY HH:mm'.
  const m = startStr.match(/^\d{2}-\d{2}-\d{4}\s(\d{2}):\d{2}$/);
  if (!m) return true; // sem hora explícita não bloqueia
  const hour = Number(m[1]);
  return hour >= wh.start && hour < wh.end;
}

interface UseTaskFormOpts {
  projectPublicId: string | undefined;
  /** Refresh callback chamado após qualquer mutação OK. */
  onMutated: () => Promise<void> | void;
  /** Callback chamado após gravação OK (`handleTaskSubmit` sucesso). Tipicamente
   *  é o `onClose` externo do TaskModal — fecha a modal após save. Sem isto,
   *  o `setShowTaskModal(false)` do hook só altera state interno (não-usado
   *  desde que a modal é controlada externamente por `ProjectListView`). */
  onSubmitSuccess?: () => void;
  /** Estado default usado quando openCreateTask não recebe um. Tipicamente o `TODO` system. */
  defaultBoardColumnPublicId?: string | null;
  /** Lookup de tasks para resolver parentPublicId → id numérico ao criar subtasks. */
  tasks: ITask[];
  /** Janela útil do projecto (para validação HOUR). null = default 9-18. */
  workHours?: WorkHours | null;
  /** Estados disponíveis (para resolver boardColumn → ITaskState). */
  states: ITaskState[];
}

export interface UseTaskFormResult {
  // Estado
  showTaskModal: boolean;
  editingTask: ITask | null;
  taskModalKey: number;
  taskModalTab: TaskModalTab;
  setTaskModalTab: React.Dispatch<React.SetStateAction<TaskModalTab>>;
  taskForm: TaskFormState;
  setTaskForm: React.Dispatch<React.SetStateAction<TaskFormState>>;
  taskOwnerIds: string[];
  setTaskOwnerIds: React.Dispatch<React.SetStateAction<string[]>>;
  taskTags: TagsFieldValue;
  setTaskTags: React.Dispatch<React.SetStateAction<TagsFieldValue>>;
  taskFormError: string;
  taskFormLoading: boolean;
  fieldRuleErrors: string[];
  setShowTaskModal: React.Dispatch<React.SetStateAction<boolean>>;
  showDeleteTask: boolean;
  setShowDeleteTask: React.Dispatch<React.SetStateAction<boolean>>;
  deletingTask: ITask | null;
  setDeletingTask: React.Dispatch<React.SetStateAction<ITask | null>>;
  deleteTaskLoading: boolean;

  // Handlers
  openCreateTask: (parentId?: number, boardColumnPublicId?: string, parentPublicId?: string) => void;
  openEditTask: (task: ITask, initialTab?: TaskModalTab) => void;
  handleTaskSubmit: (e: FormEvent) => Promise<void>;
  handleDeleteTask: () => Promise<void>;
  /** Toggle done — chama PATCH /state para `DONE` system ou reverte para `TODO`. */
  toggleTaskDone: (task: ITask, done: boolean) => Promise<void>;
}

export type TaskModalTab = 'details' | 'discussion' | 'links' | 'files';

export function useTaskForm({
  projectPublicId,
  onMutated,
  onSubmitSuccess,
  defaultBoardColumnPublicId,
  tasks,
  workHours,
  states,
}: UseTaskFormOpts): UseTaskFormResult {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalKey, setTaskModalKey] = useState(0);
  const [taskModalTab, setTaskModalTab] = useState<TaskModalTab>('details');
  const [editingTask, setEditingTask] = useState<ITask | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>({ ...EMPTY_TASK_FORM });
  const [taskOwnerIds, setTaskOwnerIds] = useState<string[]>([]);
  const [taskTags, setTaskTags] = useState<TagsFieldValue>(EMPTY_TAGS_VALUE);
  const [taskFormError, setTaskFormError] = useState('');
  const [taskFormLoading, setTaskFormLoading] = useState(false);
  const [fieldRuleErrors, setFieldRuleErrors] = useState<string[]>([]);

  const [showDeleteTask, setShowDeleteTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState<ITask | null>(null);
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);

  // Limpar erros de regras ao mudar de estado destino
  useEffect(() => { setFieldRuleErrors([]); }, [taskForm.boardColumn]);

  // Snapshot live de taskTags — apanha Enter→commit que ainda não tenha flushed
  // entre o setTaskTags queued e o click no Save.
  const taskTagsRef = useRef(taskTags);
  useEffect(() => { taskTagsRef.current = taskTags; }, [taskTags]);

  function openCreateTask(parentId = 0, boardColumnPublicId?: string, parentPublicId?: string) {
    let resolvedParentId = parentId;
    if (parentPublicId && parentId === 0) {
      const match = tasks.find((tk) => tk.publicId === parentPublicId);
      if (match) resolvedParentId = match.id;
    }
    const resolvedParentPublicId = resolvedParentId !== parentId ? '' : (parentPublicId ?? '');
    setEditingTask(null);
    setTaskForm({
      ...EMPTY_TASK_FORM,
      parent: String(resolvedParentId),
      boardColumn: boardColumnPublicId ?? defaultBoardColumnPublicId ?? '',
      parentPublicId: resolvedParentPublicId,
    });
    setTaskOwnerIds([]);
    setTaskTags(EMPTY_TAGS_VALUE);
    setTaskFormError('');
    setTaskModalTab('details');
    setTaskModalKey((k) => k + 1);
    setShowTaskModal(true);
  }

  function openEditTask(task: ITask, initialTab: TaskModalTab = 'details') {
    setEditingTask(task);
    setTaskForm({
      text: task.text,
      description: task.description ?? '',
      type: task.type,
      start_date: task.start_date ?? '',
      duration: String(task.duration),
      durationUnit: (task.durationUnit ?? 'DAY') as 'DAY' | 'HOUR',
      progress: String(Math.round((task.progress ?? 0) * 100)),
      parent: String(task.parent ?? 0),
      priority: task.priority != null ? String(task.priority) : '',
      constraint_type: task.constraint_type ?? '',
      constraint_date: task.constraint_date ?? '',
      boardColumn: task.boardColumn ?? '',
      parentPublicId: '',
    });
    setTaskOwnerIds(task.owner_id ?? []);
    setTaskTags({
      items: (task.tags ?? []).map((tg) => ({ kind: 'existing', tag: tg as Tag })),
      draft: '',
    });
    setTaskFormError('');
    setTaskModalTab(initialTab);
    setTaskModalKey((k) => k + 1);
    setShowTaskModal(true);
  }

  async function handleTaskSubmit(e: FormEvent) {
    e.preventDefault();
    setTaskFormError('');

    if (!projectPublicId) {
      setTaskFormError(tc('errors.generic'));
      return;
    }

    if (taskForm.type === 'milestone' && taskForm.parent === '0') {
      setTaskFormError(t('task.milestone_no_parent_error'));
      return;
    }

    if (!taskForm.boardColumn) {
      setTaskFormError(t('task.error_state_required'));
      return;
    }

    if (!taskForm.text.trim()) {
      setTaskFormError(t('task.error_text_required'));
      return;
    }

    setFieldRuleErrors([]);
    setTaskFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        text: taskForm.text.trim(),
        type: taskForm.type,
        progress: Number(taskForm.progress) / 100,
      };

      if (!editingTask) {
        body.description = taskForm.description ?? '';
      } else if ((taskForm.description ?? '') !== (editingTask.description ?? '')) {
        body.description = taskForm.description ?? '';
      }

      const formDur = Number(taskForm.duration);
      const formUnit = taskForm.durationUnit;

      if (formUnit === 'HOUR' && taskForm.start_date) {
        if (!isStartWithinWorkHours(taskForm.start_date, workHours ?? null)) {
          throw new Error(t('task.error_start_outside_work_hours'));
        }
      }

      const startChanged = !editingTask || taskForm.start_date !== editingTask.start_date;
      const durationChanged = !editingTask || formDur !== editingTask.duration;
      const unitChanged = !editingTask || formUnit !== ((editingTask.durationUnit as 'DAY' | 'HOUR' | undefined) ?? 'DAY');

      if (!editingTask) {
        body.start_date = taskForm.start_date;
        body.duration = formDur;
        body.durationUnit = formUnit;
        body.endDateMode = 'inclusive';
      } else {
        if (startChanged) body.start_date = taskForm.start_date;
        if (durationChanged) body.duration = formDur;
        if (unitChanged) body.durationUnit = formUnit;
        if (startChanged || durationChanged || unitChanged) {
          body.endDateMode = 'inclusive';
        }
      }

      if (!editingTask && taskForm.parentPublicId && taskForm.parent === '0') {
        body.parentPublicId = taskForm.parentPublicId;
      } else {
        body.parent = Number(taskForm.parent);
      }

      if (taskForm.priority !== '') {
        body.priority = Number(taskForm.priority);
      } else if (editingTask) {
        body.priority = null;
      }

      if (taskForm.constraint_type) {
        body.constraint_type = taskForm.constraint_type;
      } else if (editingTask) {
        body.constraint_type = null;
      }
      if (taskForm.constraint_date && CONSTRAINT_NEEDS_DATE.has(taskForm.constraint_type)) {
        body.constraint_date = taskForm.constraint_date;
      } else if (editingTask) {
        body.constraint_date = null;
      }

      body.owner_id = taskOwnerIds;
      const tagPayload = tagsValueToPayload(taskTagsRef.current);
      body.tagPublicIds = tagPayload.tagPublicIds;
      body.newTagNames = tagPayload.newTagNames;

      const path = editingTask
        ? `/projects/${projectPublicId}/planning/tasks/${editingTask.publicId}`
        : `/projects/${projectPublicId}/planning/tasks`;

      let saved: ITask;
      try {
        saved = editingTask
          ? await apiPut<ITask>(path, body)
          : await apiPost<ITask>(path, body);
      } catch (err) {
        // apiPost/apiPut atiram Error com `.message` = body.message (string) ou
        // primeira mensagem do array. Mas perdemos `error_code` — fazer fetch
        // raw para extrair contexto detalhado.
        const friendly = err instanceof Error ? err.message : tc('errors.generic');
        // Tentar mapear codes conhecidos pela mensagem (best-effort).
        if (friendly.includes('TASK_DURATION_EXCEEDS_LIMIT')) {
          throw new Error(t('task.error_duration_too_long'));
        }
        if (friendly.includes('START_OUTSIDE_WORK_HOURS')) {
          throw new Error(t('task.error_start_outside_work_hours'));
        }
        if (friendly.includes('TAG_NAME_INVALID_CHARS')) {
          throw new Error(t('task.error_tag_invalid_chars'));
        }
        if (friendly.includes('TAG_NAME_TOO_LONG')) {
          throw new Error(t('task.error_tag_too_long'));
        }
        if (friendly.includes('TAG_NAME_TOO_SHORT')) {
          throw new Error(t('task.error_tag_too_short'));
        }
        throw err;
      }

      // Se a coluna mudou em modo edição, persistir via endpoint dedicado.
      const publicId = editingTask?.publicId ?? saved?.publicId;
      const oldBoardColumn = editingTask?.boardColumn ?? null;
      const newBoardColumn = taskForm.boardColumn || null;
      if (publicId && newBoardColumn && newBoardColumn !== oldBoardColumn) {
        try {
          await apiPatch(
            `/projects/${projectPublicId}/planning/tasks/${publicId}/state`,
            { stateId: newBoardColumn, position: 999999 },
          );
        } catch (e) {
          showToast('warning', e instanceof Error ? e.message : tc('errors.generic'));
        }
      }

      setShowTaskModal(false);
      showToast('success', editingTask ? t('task.success_updated') : t('task.success_created'));
      if (tagPayload.newTagNames.length > 0) {
        invalidateWorkspaceTagsCache();
      }
      await onMutated();
      /* Fecha a modal externa (`taskModalOpen` em ProjectListView). Sem
         este callback, só o state interno `showTaskModal` ficava a false
         — a modal continuava aberta porque é controlada pelo container. */
      onSubmitSuccess?.();
    } catch (e: unknown) {
      setTaskFormError(e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setTaskFormLoading(false);
    }
  }

  async function handleDeleteTask() {
    if (!deletingTask || !projectPublicId) return;
    setDeleteTaskLoading(true);
    try {
      await apiDelete(
        `/projects/${projectPublicId}/planning/tasks/${deletingTask.publicId}`,
      );
      setShowDeleteTask(false);
      setDeletingTask(null);
      setShowTaskModal(false);
      showToast('success', t('task.success_deleted'));
      await onMutated();
    } catch (e: unknown) {
      showToast('danger', e instanceof Error ? e.message : t('task.error_delete'));
    } finally {
      setDeleteTaskLoading(false);
    }
  }

  /** Toggle done — usa state system `DONE` para marcar; reverte para `TODO`
   *  quando desmarcado. Se o projecto não tiver esses estados system, no-op. */
  async function toggleTaskDone(task: ITask, done: boolean) {
    if (!projectPublicId) return;
    const targetKey = done ? 'DONE' : 'TODO';
    const target = states.find((s) => s.systemKey === targetKey);
    if (!target) {
      showToast('warning', t('task.error_no_system_state', { key: targetKey }));
      return;
    }
    try {
      // Use fetch directo para evitar throw em status 4xx (mostramos toast nós próprios).
      const res = await apiFetch(
        `${getApiBase()}/projects/${projectPublicId}/planning/tasks/${task.publicId}/state`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stateId: target.publicId, position: 999999 }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await onMutated();
    } catch (e) {
      showToast('danger', e instanceof Error ? e.message : tc('errors.generic'));
    }
  }

  return {
    showTaskModal, setShowTaskModal,
    taskModalKey,
    taskModalTab, setTaskModalTab,
    editingTask,
    taskForm, setTaskForm,
    taskOwnerIds, setTaskOwnerIds,
    taskTags, setTaskTags,
    taskFormError,
    taskFormLoading,
    fieldRuleErrors,
    showDeleteTask, setShowDeleteTask,
    deletingTask, setDeletingTask,
    deleteTaskLoading,
    openCreateTask, openEditTask,
    handleTaskSubmit, handleDeleteTask,
    toggleTaskDone,
  };
}
