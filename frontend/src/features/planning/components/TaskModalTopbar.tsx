import { useTranslation } from 'react-i18next';
import { useTimezone } from '../../../contexts/TimezoneContext';
import { relativeTimeInTimezone } from '../../../lib/dateFormatting';
import type { GanttTask } from '../types';

interface Props {
  editingTask: GanttTask | null;
  isFollowing: boolean;
  onToggleFollow: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

/**
 * Linha 1 do modal — barra de identificação fixa.
 * Badge "TAREFA" / "SUBTAREFA" à esquerda, "Atualizada há X" no meio,
 * Seguindo / fullscreen / fechar à direita.
 *
 * "por X" só é exibido quando o backend devolve um actor — o schema
 * GanttTask não tem hoje `updatedById`, então cai em "Atualizada há X".
 */
export function TaskModalTopbar({
  editingTask,
  isFollowing,
  onToggleFollow,
  fullscreen,
  onToggleFullscreen,
  onClose,
}: Props) {
  const { t } = useTranslation('planning');
  const tz = useTimezone();

  const isSubtask = editingTask ? editingTask.parent && editingTask.parent !== 0 : false;
  const idLabel = editingTask
    ? t(isSubtask ? 'task.id_badge_subtask' : 'task.id_badge_task')
    : null;

  const updatedAt = editingTask?.updatedAt ?? null;
  const updatedRel = updatedAt ? relativeTimeInTimezone(updatedAt, tz, t as never) : null;
  const updatedActorName: string | null = null; // schema sem updatedById ainda

  const updatedText = updatedRel
    ? (updatedActorName
        ? t('task.updated_at_by', { relative: updatedRel, name: updatedActorName })
        : t('task.updated_at_no_actor', { relative: updatedRel }))
    : null;

  return (
    <div className="task-topbar">
      {idLabel && (
        <span className="task-id-badge">
          <i className="ri-task-line" aria-hidden="true" />
          {idLabel}
        </span>
      )}
      {updatedText && (
        <span className="task-topbar-meta">
          <i className="ri-history-line" aria-hidden="true" />
          {updatedText}
        </span>
      )}
      <span className="task-topbar-spacer" />
      <div className="task-topbar-actions">
        <button
          type="button"
          className="task-icon-btn"
          onClick={onToggleFollow}
          title={isFollowing ? t('task.btn_following') : t('task.btn_follow')}
          style={{ width: 'auto', padding: '0 12px', gap: 6 }}
        >
          <i className={isFollowing ? 'ri-notification-3-fill' : 'ri-notification-3-line'} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {isFollowing ? t('task.btn_following') : t('task.btn_follow')}
          </span>
        </button>
        <button
          type="button"
          className="task-icon-btn"
          onClick={onToggleFullscreen}
          title={t(fullscreen ? 'task.btn_exit_fullscreen' : 'task.btn_fullscreen')}
        >
          <i className={fullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="task-icon-btn"
          onClick={onClose}
          title={t('task.btn_close')}
        >
          <i className="ri-close-line" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
