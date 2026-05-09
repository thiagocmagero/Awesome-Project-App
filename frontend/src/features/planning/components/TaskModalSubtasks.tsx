import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StateBadge } from './StateBadge';
import type { Task } from '../types';
import type { ITaskState } from '../states-types';

interface Props {
  parentTask: Task;
  tasks: Task[];
  boardColumns: ITaskState[];
  onAddSubtask: (parentPublicId: string) => void;
  onOpenSubtask: (task: Task) => void;
}

const VISIBLE_LIMIT = 4;

/**
 * Lista subtarefas (filter `tasks.parent === parentTask.id`) com checkbox
 * visual, pílula de estado e clique → abrir modal da subtarefa.
 *
 * O checkbox é apenas decorativo — reflecte se a subtask está numa coluna
 * `systemKey === 'DONE'`. Para mover entre colunas, abrir a subtarefa.
 */
export function TaskModalSubtasks({
  parentTask,
  tasks,
  boardColumns,
  onAddSubtask,
  onOpenSubtask,
}: Props) {
  const { t } = useTranslation('planning');
  const [showAll, setShowAll] = useState(false);

  const subtasks = tasks.filter((t) => t.parent === parentTask.id && t.id !== parentTask.id);
  const total = subtasks.length;

  // Concluídas — `boardColumn` mapeado para uma coluna `systemKey === 'DONE'`.
  const doneColumnIds = new Set(
    boardColumns.filter((c) => c.systemKey === 'DONE').map((c) => c.publicId),
  );
  const doneCount = subtasks.filter((s) => s.boardColumn && doneColumnIds.has(s.boardColumn)).length;

  const visible = showAll ? subtasks : subtasks.slice(0, VISIBLE_LIMIT);
  const hasMore = total > VISIBLE_LIMIT && !showAll;

  return (
    <section className="task-section">
      <div className="task-section-title-row">
        <h6 className="task-section-title">
          {t('task.subtasks.title')}
          <span className="task-section-title-sub" style={{ fontWeight: 400, color: 'var(--task-muted)', marginLeft: 6, fontSize: 12.5 }}>
            · {t('task.subtasks.count', { done: doneCount, total })}
          </span>
        </h6>
        <button
          type="button"
          className="btn btn-sm btn-purple-outline ms-auto"
          onClick={() => onAddSubtask(parentTask.publicId)}
        >
          {t('task.subtasks.btn_add')}
        </button>
      </div>

      {total === 0 ? (
        <div className="subtask-list">
          <div className="subtask-empty">{t('task.subtasks.empty')}</div>
        </div>
      ) : (
        <div className="subtask-list">
          {visible.map((sub) => {
            const column = boardColumns.find((c) => c.publicId === sub.boardColumn) ?? null;
            const isDone = !!sub.boardColumn && doneColumnIds.has(sub.boardColumn);
            return (
              <button
                key={sub.publicId}
                type="button"
                className={`subtask-row${isDone ? ' is-done' : ''}`}
                onClick={() => onOpenSubtask(sub)}
              >
                <span className="subtask-name" title={sub.text}>{sub.text}</span>
                <StateBadge column={column} />
              </button>
            );
          })}
          {hasMore && (
            <button
              type="button"
              className="subtask-view-all"
              onClick={() => setShowAll(true)}
            >
              {t('task.subtasks.view_all', { n: total })}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
