// Hook: gestão de estado e handlers do formulário e CRUD de tarefa
import { useState, useEffect, type FormEvent, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiBase, apiFetch } from '../../lib/api';
import { EMPTY_TASK_FORM, CONSTRAINT_NEEDS_DATE } from './types';
import type { Task, ShowToastFn } from './types';
import { isStartWithinWorkHours, type WorkHours } from '../../lib/workHours';

export interface UseTaskFormProps {
  projectId: string | undefined;
  token: string | null;
  tasks: Task[];
  endDateModeRef: MutableRefObject<'inclusive' | 'exclusive'>;
  loadAll: () => Promise<void>;
  showToast: ShowToastFn;
  workHoursRef?: MutableRefObject<WorkHours | null>;
  /** publicId do estado default (tipicamente o `systemKey='TODO'`) usado
   *  para pré-preencher o campo "Estado" em criação de tarefa. Nunca pode
   *  ficar vazio — o submit rejeita `boardColumn` sem valor. */
  defaultBoardColumnPublicId?: string | null;
  /** Chamado de forma síncrona antes de qualquer setState em openEditTask /
   *  openCreateTask. Usado para destruir instâncias Choices.js antes que o
   *  React reconcilie os <option>, evitando o crash "removeChild". */
  onBeforeOpen?: () => void;
  /** Valida campos obrigatórios para o estado destino; devolve lista de mensagens de erro. */
  validateTaskForm?: (
    form: typeof EMPTY_TASK_FORM,
    ownerIds: string[],
    statePublicId: string | null,
  ) => string[];
}

export interface UseTaskFormReturn {
  showTaskModal: boolean;
  setShowTaskModal: React.Dispatch<React.SetStateAction<boolean>>;
  taskModalKey: number;
  taskModalTab: 'details' | 'comments' | 'links' | 'files';
  setTaskModalTab: React.Dispatch<React.SetStateAction<'details' | 'comments' | 'links' | 'files'>>;
  editingTask: Task | null;
  taskForm: typeof EMPTY_TASK_FORM;
  setTaskForm: React.Dispatch<React.SetStateAction<typeof EMPTY_TASK_FORM>>;
  taskOwnerIds: string[];
  setTaskOwnerIds: React.Dispatch<React.SetStateAction<string[]>>;
  taskFormError: string;
  taskFormLoading: boolean;
  fieldRuleErrors: string[];
  showDeleteTask: boolean;
  setShowDeleteTask: React.Dispatch<React.SetStateAction<boolean>>;
  deletingTask: Task | null;
  setDeletingTask: React.Dispatch<React.SetStateAction<Task | null>>;
  deleteTaskLoading: boolean;
  openCreateTask: (parentId?: number, boardColumnPublicId?: string, parentPublicId?: string) => void;
  openEditTask: (task: Task, initialTab?: 'details' | 'comments' | 'links') => void;
  handleTaskSubmit: (e: FormEvent) => Promise<void>;
  handleDeleteTask: () => Promise<void>;
}

export function useTaskForm({
  projectId, token, tasks: _tasks, endDateModeRef, loadAll, showToast, workHoursRef, defaultBoardColumnPublicId, onBeforeOpen, validateTaskForm,
}: UseTaskFormProps): UseTaskFormReturn {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const api = getApiBase();

  const [showTaskModal, setShowTaskModal]     = useState(false);
  const [taskModalKey, setTaskModalKey]       = useState(0);
  const [taskModalTab, setTaskModalTab]       = useState<'details' | 'comments' | 'links' | 'files'>('details');
  const [editingTask, setEditingTask]         = useState<Task | null>(null);
  const [taskForm, setTaskForm]               = useState({ ...EMPTY_TASK_FORM });
  const [taskOwnerIds, setTaskOwnerIds]       = useState<string[]>([]);
  const [taskFormError, setTaskFormError]     = useState('');
  const [taskFormLoading, setTaskFormLoading] = useState(false);
  const [fieldRuleErrors, setFieldRuleErrors] = useState<string[]>([]);

  const [showDeleteTask, setShowDeleteTask]       = useState(false);
  const [deletingTask, setDeletingTask]           = useState<Task | null>(null);
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);

  // Limpar erros de regras ao mudar de estado destino
  useEffect(() => { setFieldRuleErrors([]); }, [taskForm.boardColumn]);

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  function openCreateTask(parentId = 0, boardColumnPublicId?: string, parentPublicId?: string) {
    // Destruir Choices antes de qualquer setState para que os <option> estejam de
    // volta ao <select> quando o React reconciliar — evita o crash "removeChild".
    onBeforeOpen?.();
    // Se parentPublicId foi fornecido (ex: Board "+" subtask), resolver o id numérico
    // da tarefa pai para que o select do modal fique pré-seleccionado correctamente.
    let resolvedParentId = parentId;
    if (parentPublicId && parentId === 0) {
      const match = _tasks.find((tk) => tk.publicId === parentPublicId);
      if (match) resolvedParentId = match.id;
    }
    const resolvedParentPublicId = resolvedParentId !== parentId ? '' : (parentPublicId ?? '');
    setEditingTask(null);
    setTaskForm({
      ...EMPTY_TASK_FORM,
      parent: String(resolvedParentId),
      // Default: estado seleccionado explicitamente > default do projecto (TODO) > vazio.
      // O submit rejeita boardColumn vazio, garantindo que TODO é o mínimo.
      boardColumn: boardColumnPublicId ?? defaultBoardColumnPublicId ?? '',
      parentPublicId: resolvedParentPublicId,
    });
    setTaskOwnerIds([]);
    setTaskFormError('');
    setTaskModalTab('details');
    setTaskModalKey((k) => k + 1);
    setShowTaskModal(true);
  }

  function openEditTask(task: Task, initialTab: 'details' | 'comments' | 'links' = 'details') {
    // Destruir Choices antes de qualquer setState para que os <option> estejam de
    // volta ao <select> quando o React reconciliar — evita o crash "removeChild".
    onBeforeOpen?.();
    setEditingTask(task);
    setTaskForm({
      text: task.text,
      description: task.description ?? '',
      type: task.type,
      start_date: task.start_date ?? '',
      duration: String(task.duration),
      durationUnit: (task.durationUnit ?? 'DAY') as 'DAY' | 'HOUR',
      progress: String(Math.round(task.progress * 100)),
      parent: String(task.parent ?? 0),
      priority: task.priority != null ? String(task.priority) : '',
      constraint_type: task.constraint_type ?? '',
      constraint_date: task.constraint_date ?? '',
      boardColumn: task.boardColumn ?? '',
      parentPublicId: '',
    });
    setTaskOwnerIds(task.owner_id ?? []);
    setTaskFormError('');
    setTaskModalTab(initialTab);
    setTaskModalKey((k) => k + 1);
    setShowTaskModal(true);
  }

  async function handleTaskSubmit(e: FormEvent) {
    e.preventDefault();
    setTaskFormError('');

    if (taskForm.type === 'milestone' && taskForm.parent === '0') {
      setTaskFormError(t('task.milestone_no_parent_error'));
      return;
    }

    // Estado é obrigatório — nunca permitir gravar sem state (REQ Mai 2026).
    if (!taskForm.boardColumn) {
      setTaskFormError(t('task.error_state_required'));
      return;
    }

    // Validar campos obrigatórios do estado destino antes do round-trip.
    if (validateTaskForm) {
      const stateTarget = taskForm.boardColumn || null;
      const ruleErrors = validateTaskForm(taskForm, taskOwnerIds, stateTarget);
      if (ruleErrors.length > 0) {
        setFieldRuleErrors(ruleErrors);
        return;
      }
    }
    setFieldRuleErrors([]);

    setTaskFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        text: taskForm.text.trim(),
        type: taskForm.type,
        progress: Number(taskForm.progress) / 100,
      };

      // Description só é enviado em update se mudou; em create vai sempre.
      if (!editingTask) {
        body.description = taskForm.description ?? '';
      } else if ((taskForm.description ?? '') !== (editingTask.description ?? '')) {
        body.description = taskForm.description ?? '';
      }

      // Em modo edição, só envia start_date / duration / durationUnit / endDateMode
      // se o user **realmente** os alterou no form. Caso contrário o backend
      // recalcula endDate sem necessidade e qualquer round-trip drift de tz é
      // amplificado a cada save (causa raiz do bug "16:00 → 20:00 → 00:00" em
      // tasks HOUR — Maio 2026). Comparação por string normalizada.
      const formDur = Number(taskForm.duration);
      const formUnit = (taskForm.durationUnit ?? 'DAY') as 'DAY' | 'HOUR';

      // Validação local: tasks HOUR têm de ter o `start` dentro da janela útil
      // do projecto. Bloqueia antes do round-trip — UX imediata.
      if (formUnit === 'HOUR' && taskForm.start_date) {
        const wh = workHoursRef?.current ?? null;
        if (!isStartWithinWorkHours(taskForm.start_date, wh)) {
          throw new Error(t('task.error_start_outside_work_hours'));
        }
      }

      const startChanged = !editingTask || taskForm.start_date !== editingTask.start_date;
      const durationChanged = !editingTask || formDur !== editingTask.duration;
      const unitChanged = !editingTask || formUnit !== ((editingTask.durationUnit as 'DAY' | 'HOUR' | undefined) ?? 'DAY');

      if (!editingTask) {
        // Criação — envia tudo (campos obrigatórios).
        body.start_date = taskForm.start_date;
        body.duration = formDur;
        body.durationUnit = formUnit;
        body.endDateMode = endDateModeRef.current;
      } else {
        // Edição — envia apenas o que mudou. Se start/duration/unit mudaram,
        // envia também endDateMode (o backend precisa dele para recalc).
        if (startChanged) body.start_date = taskForm.start_date;
        if (durationChanged) body.duration = formDur;
        if (unitChanged) body.durationUnit = formUnit;
        if (startChanged || durationChanged || unitChanged) {
          body.endDateMode = endDateModeRef.current;
        }
      }

      if (!editingTask && taskForm.parentPublicId && taskForm.parent === '0') {
        body.parentPublicId = taskForm.parentPublicId;
      } else {
        body.parent = Number(taskForm.parent);
      }
      // Priority: '' = limpar (null), '0'..'3' = valor (0=Crítica é válido).
      // Em criação, só envia se preenchido. Em edição envia sempre — null limpa.
      if (taskForm.priority !== '') {
        body.priority = Number(taskForm.priority);
      } else if (editingTask) {
        body.priority = null;
      }
      // Constraint type: '' = limpar (null) em edição.
      if (taskForm.constraint_type) {
        body.constraint_type = taskForm.constraint_type;
      } else if (editingTask) {
        body.constraint_type = null;
      }
      if (taskForm.constraint_date && CONSTRAINT_NEEDS_DATE.has(taskForm.constraint_type)) {
        body.constraint_date = taskForm.constraint_date;
      } else if (editingTask) {
        // Se não há constraint_type ou não precisa de data, limpa em edição.
        body.constraint_date = null;
      }
      body.owner_id = taskOwnerIds;

      const url = editingTask
        ? `${api}/projects/${projectId}/planning/tasks/${editingTask.publicId}`
        : `${api}/projects/${projectId}/planning/tasks`;
      const method = editingTask ? 'PUT' : 'POST';

      const res = await apiFetch(url, { method, headers: h(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        // AppException devolve { error_code, statusCode }. ValidationPipe
        // devolve { message: string | string[], statusCode }. Tratar ambos.
        const code = data.error_code as string | undefined;
        const msg = Array.isArray(data.message) ? data.message.join(' · ') : data.message;
        // Caso especial: regras de campos obrigatórios — popula fieldRuleErrors em vez do erro genérico.
        if (code === 'TASK_MISSING_REQUIRED_FIELDS' && Array.isArray(data.fields)) {
          const labels = (data.fields as string[]).map(
            (f) => t(`states.rules.field.${f}` as Parameters<typeof t>[0]),
          );
          setFieldRuleErrors(labels);
          return;
        }
        // Mapeia códigos do backend para mensagens i18n amigáveis.
        const friendly = code === 'TASK_DURATION_EXCEEDS_LIMIT'
          ? t('task.error_duration_too_long')
          : code === 'START_OUTSIDE_WORK_HOURS'
            ? t('task.error_start_outside_work_hours')
            : (msg || code || t('task.error_save'));
        throw new Error(friendly);
      }

      // Se a coluna mudou no modo de edição, persistir via endpoint dedicado.
      // Tail da coluna destino: enviamos position=large-number, backend trata re-sequencing.
      const publicId = editingTask?.publicId ?? data?.publicId;
      const oldBoardColumn = editingTask?.boardColumn ?? null;
      const newBoardColumn = taskForm.boardColumn || null;
      if (publicId && newBoardColumn && newBoardColumn !== oldBoardColumn) {
        // Chamada best-effort: se falhar, notificamos mas não bloqueamos a UI.
        const moveRes = await apiFetch(
          `${api}/projects/${projectId}/planning/tasks/${publicId}/state`,
          {
            method: 'PATCH',
            headers: h(),
            body: JSON.stringify({ stateId: newBoardColumn, position: 999999 }),
          },
        );
        if (!moveRes.ok) {
          const moveData = await moveRes.json().catch(() => ({}));
          const moveMsg = Array.isArray(moveData.message) ? moveData.message.join(' · ') : moveData.message;
          showToast('warning', moveMsg || tc('errors.generic'));
        }
      }

      setShowTaskModal(false);
      showToast('success', editingTask ? t('task.success_updated') : t('task.success_created'));
      await loadAll();
    } catch (e: unknown) {
      setTaskFormError(e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setTaskFormLoading(false);
    }
  }

  async function handleDeleteTask() {
    if (!deletingTask) return;
    setDeleteTaskLoading(true);
    try {
      const res = await apiFetch(
        `${api}/projects/${projectId}/planning/tasks/${deletingTask.publicId}`,
        { method: 'DELETE', headers: h() },
      );
      if (!res.ok) throw new Error(t('task.error_delete'));
      setShowDeleteTask(false);
      setDeletingTask(null);
      showToast('success', t('task.success_deleted'));
      await loadAll();
    } catch (e: unknown) {
      showToast('danger', e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setDeleteTaskLoading(false);
    }
  }

  return {
    showTaskModal, setShowTaskModal,
    taskModalKey,
    taskModalTab, setTaskModalTab,
    editingTask,
    taskForm, setTaskForm,
    taskOwnerIds, setTaskOwnerIds,
    taskFormError,
    taskFormLoading,
    fieldRuleErrors,
    showDeleteTask, setShowDeleteTask,
    deletingTask, setDeletingTask,
    deleteTaskLoading,
    openCreateTask, openEditTask,
    handleTaskSubmit, handleDeleteTask,
  };
}
