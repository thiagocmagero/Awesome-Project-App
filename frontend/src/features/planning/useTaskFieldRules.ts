import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITaskState, TaskFieldKey } from './states-types';
import type { EMPTY_TASK_FORM, Task } from './types';

type TaskFormShape = typeof EMPTY_TASK_FORM;

/** Verifica se uma task viola as regras do seu estado actual. */
function taskViolatesRules(task: Task, requiredFields: Set<TaskFieldKey>): boolean {
  if (requiredFields.size === 0) return false;
  const isMilestone = task.type === 'milestone';
  for (const field of requiredFields) {
    switch (field) {
      case 'description':
        if (!task.description || !task.description.trim()) return true;
        break;
      case 'schedule':
        if (!task.start_date) return true;
        break;
      case 'duration':
        if (!isMilestone && (!task.duration || task.duration <= 0)) return true;
        break;
      case 'restriction':
        if (!task.constraint_type) return true;
        break;
      case 'type':
        if (!task.type) return true;
        break;
      case 'priority':
        if (task.priority == null) return true;
        break;
      case 'assignees':
        if (!task.owner_id || task.owner_id.length === 0) return true;
        break;
    }
  }
  return false;
}

export function useTaskFieldRules(states: ITaskState[]) {
  const { t } = useTranslation('planning');

  const rulesMap = useMemo(() => {
    const map = new Map<string, Set<TaskFieldKey>>();
    for (const state of states) {
      map.set(state.publicId, new Set(state.rules.filter((r) => r.isRequired).map((r) => r.field)));
    }
    return map;
  }, [states]);

  function getRequiredFields(statePublicId: string | null): Set<TaskFieldKey> {
    if (!statePublicId) return new Set();
    return rulesMap.get(statePublicId) ?? new Set();
  }

  function validateTaskForm(
    form: TaskFormShape,
    ownerIds: string[],
    statePublicId: string | null,
  ): string[] {
    const required = getRequiredFields(statePublicId);
    if (required.size === 0) return [];

    const errors: string[] = [];
    const isMilestone = form.type === 'milestone';

    if (required.has('description') && !form.description?.trim()) {
      errors.push(t('states.rules.field.description'));
    }
    if (required.has('schedule') && !form.start_date) {
      errors.push(t('states.rules.field.schedule'));
    }
    if (required.has('duration') && !isMilestone) {
      const dur = Number(form.duration);
      if (!dur || dur <= 0) errors.push(t('states.rules.field.duration'));
    }
    if (required.has('restriction') && !form.constraint_type) {
      errors.push(t('states.rules.field.restriction'));
    }
    if (required.has('type') && !form.type) {
      errors.push(t('states.rules.field.type'));
    }
    if (required.has('priority') && !form.priority) {
      errors.push(t('states.rules.field.priority'));
    }
    if (required.has('assignees') && (!ownerIds || ownerIds.length === 0)) {
      errors.push(t('states.rules.field.assignees'));
    }

    return errors;
  }

  /**
   * Devolve um Set de publicIds de tasks que violam as regras do estado actual
   * onde estão. Usado pelo Board e Planning list para destacar visualmente
   * (border-top vermelho) cards que precisam de atenção.
   */
  function getViolatingTaskIds(tasks: Task[]): Set<string> {
    const violating = new Set<string>();
    for (const task of tasks) {
      const stateId = task.boardColumn ?? null;
      if (!stateId) continue;
      const required = rulesMap.get(stateId);
      if (!required || required.size === 0) continue;
      if (taskViolatesRules(task, required)) {
        violating.add(task.publicId);
      }
    }
    return violating;
  }

  return { rulesMap, getRequiredFields, validateTaskForm, getViolatingTaskIds };
}
