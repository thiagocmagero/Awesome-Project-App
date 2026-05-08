import { useTranslation } from 'react-i18next';

type TaskTab = 'details' | 'comments' | 'links' | 'files';

interface Props {
  tab: TaskTab;
  setTab: (t: TaskTab) => void;
  showFilesTab: boolean;
  counts: { comments: number; links: number; files: number };
}

/**
 * Linha 5 — barra de tabs estilo browser tab (bordo inferior fino).
 * Aba activa: cor roxa + bordo inferior 2px + contador roxo cheio.
 * Aba inactiva: contador em pílula clara.
 */
export function TaskModalTabsBar({ tab, setTab, showFilesTab, counts }: Props) {
  const { t } = useTranslation('planning');
  const { t: tf } = useTranslation('files');

  return (
    <div className="task-tabs-bar" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'details'}
        className={`task-tab${tab === 'details' ? ' is-active' : ''}`}
        onClick={() => setTab('details')}
      >
        <i className="ri-file-list-3-line" aria-hidden="true" />
        {t('task.form.tab_details')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'comments'}
        className={`task-tab${tab === 'comments' ? ' is-active' : ''}`}
        onClick={() => setTab('comments')}
      >
        <i className="ri-chat-3-line" aria-hidden="true" />
        {t('task.form.tab_discussion')}
        {counts.comments > 0 && <span className="tab-count">{counts.comments}</span>}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'links'}
        className={`task-tab${tab === 'links' ? ' is-active' : ''}`}
        onClick={() => setTab('links')}
      >
        <i className="ri-link" aria-hidden="true" />
        {t('task.form.tab_links')}
        {counts.links > 0 && <span className="tab-count">{counts.links}</span>}
      </button>
      {showFilesTab && (
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'files'}
          className={`task-tab${tab === 'files' ? ' is-active' : ''}`}
          onClick={() => setTab('files')}
        >
          <i className="ri-attachment-2" aria-hidden="true" />
          {tf('page.tab_label')}
          {counts.files > 0 && <span className="tab-count">{counts.files}</span>}
        </button>
      )}
    </div>
  );
}
