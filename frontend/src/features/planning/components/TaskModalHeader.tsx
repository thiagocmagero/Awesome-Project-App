import { useTranslation } from 'react-i18next';
import { TaskModalTagsField } from './TaskModalTagsField';
import type { EMPTY_TASK_FORM } from '../types';

type TaskFormShape = typeof EMPTY_TASK_FORM;
type TaskTab = 'details' | 'comments' | 'links' | 'files';

interface Props {
  taskForm: TaskFormShape;
  setTaskForm: (form: TaskFormShape) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  showCounters: boolean;
  counts: { comments: number; files: number; followers: number };
  showFilesCounter: boolean;
  onJumpTab: (tab: TaskTab) => void;
}

/**
 * Linha 2 (título inline editável) + linha 3 (tags + contadores clicáveis).
 *
 * Os contadores no canto direito navegam para o respectivo tab. Seguidores é
 * UI-only por enquanto.
 */
export function TaskModalHeader({
  taskForm,
  setTaskForm,
  tags,
  setTags,
  showCounters,
  counts,
  showFilesCounter,
  onJumpTab,
}: Props) {
  const { t } = useTranslation('planning');

  return (
    <div className="task-header">
      <input
        type="text"
        className="task-title-input"
        value={taskForm.text}
        onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
        placeholder={t('task.title_placeholder')}
        required
      />
      <div className="task-meta-row">
        <TaskModalTagsField tags={tags} setTags={setTags} />
        {showCounters && (
          <div className="task-meta-row-counters">
            <button
              type="button"
              className="task-meta-counter"
              onClick={() => onJumpTab('comments')}
              title={t('task.form.tab_discussion')}
            >
              <i className="ri-chat-3-line" aria-hidden="true" />
              <span className="task-meta-counter-value">{counts.comments}</span>
            </button>
            {showFilesCounter && (
              <button
                type="button"
                className="task-meta-counter"
                onClick={() => onJumpTab('files')}
                title={t('task.form.tab_files')}
              >
                <i className="ri-attachment-2" aria-hidden="true" />
                <span className="task-meta-counter-value">{counts.files}</span>
              </button>
            )}
            <button
              type="button"
              className="task-meta-counter"
              title={t('task.counts.followers')}
            >
              <i className="ri-eye-line" aria-hidden="true" />
              <span className="task-meta-counter-value">{counts.followers}</span>
              <span className="task-meta-counter-label">{t('task.counts.followers')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
