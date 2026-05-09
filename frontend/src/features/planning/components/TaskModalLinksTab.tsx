import { useTranslation } from 'react-i18next';
import type { Task } from '../types';

interface LinkRow {
  id: string | number;
  publicId: string;
  source: number;
  target: number;
  type: string;
}

interface Props {
  editingTask: Task;
  links: LinkRow[];
  tasksById?: Map<number, { publicId: string; text: string }>;
  onAddLink?: () => void;
  onRemoveLink?: (linkPublicId: string) => void;
}

const LINK_TYPE_KEY: Record<string, string> = {
  '0': 'task.links.type_fs_long',
  '1': 'task.links.type_ss_long',
  '2': 'task.links.type_ff_long',
  '3': 'task.links.type_sf_long',
};

/**
 * Tab Vínculos com agrupamento Predecessoras / Sucessoras.
 * Substitui a tabela inline anterior do TaskModal.
 */
export function TaskModalLinksTab({
  editingTask,
  links,
  tasksById,
  onAddLink,
  onRemoveLink,
}: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const filtered = links.filter(
    (l) => l.source === editingTask.id || l.target === editingTask.id,
  );

  const predecessors = filtered.filter((l) => l.target === editingTask.id);
  const successors   = filtered.filter((l) => l.source === editingTask.id);

  const taskLabel = (id: number, asLink = true): JSX.Element => {
    if (id === editingTask.id) {
      return <span className="link-task-mute">{t('task.links.this_task')}</span>;
    }
    const meta = tasksById?.get(id);
    const text = meta?.text ?? `#${id}`;
    if (!asLink) return <>{text}</>;
    return (
      <span className="link-task">
        <i className="ri-task-line" aria-hidden="true" />
        {text}
      </span>
    );
  };

  const linkTypeLabel = (typ: string): string => {
    const key = LINK_TYPE_KEY[typ];
    return key ? t(key as never) : typ;
  };

  function renderGroup(label: string, items: LinkRow[], iconClass: string) {
    if (items.length === 0) return null;
    return (
      <section className="task-links-group">
        <header className="link-group-header">
          <i className={iconClass} aria-hidden="true" />
          {label}
          <span className="tab-count">{items.length}</span>
        </header>
        <table className="links-table">
          <thead>
            <tr>
              <th style={{ width: '36%' }}>{t('task.links.col_source')}</th>
              <th style={{ width: '36%' }}>{t('task.links.col_target')}</th>
              <th style={{ width: '20%' }}>{t('task.links.col_type')}</th>
              <th style={{ width: '8%' }} className="text-end">{t('task.links.col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.publicId}>
                <td>{taskLabel(l.source)}</td>
                <td>{taskLabel(l.target)}</td>
                <td><span className="link-type-pill">{linkTypeLabel(l.type)}</span></td>
                <td className="text-end">
                  <button
                    type="button"
                    className="task-icon-btn is-danger"
                    style={{ width: 28, height: 28 }}
                    title={tc('actions.delete')}
                    onClick={() => onRemoveLink?.(l.publicId)}
                  >
                    <i className="ri-delete-bin-line" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  return (
    <div className="task-links">
      <div className="task-links-header">
        <h6>
          <i className="ri-link" aria-hidden="true" />
          {t('task.links.title')}
          {filtered.length > 0 && <span className="tab-count">{filtered.length}</span>}
        </h6>
        {onAddLink && (
          <button
            type="button"
            className="btn btn-purple btn-sm"
            onClick={onAddLink}
          >
            <i className="ri-add-line me-1" aria-hidden="true" />
            {t('task.links.btn_add')}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="task-links-empty">
          <i className="ri-link" aria-hidden="true" />
          <div className="title">{t('task.links.empty')}</div>
          <div>{t('task.links.empty_long')}</div>
        </div>
      ) : (
        <>
          {renderGroup(
            t('task.links.group_predecessors'),
            predecessors,
            'ri-arrow-down-left-line',
          )}
          {renderGroup(
            t('task.links.group_successors'),
            successors,
            'ri-arrow-up-right-line',
          )}
        </>
      )}
    </div>
  );
}
