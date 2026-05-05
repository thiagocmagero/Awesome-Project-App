import { useTranslation } from 'react-i18next';

export function PriorityBadge({ priority }: { priority?: number }) {
  const { t } = useTranslation('planning');
  if (priority === 0) return <span className="badge bg-danger text-white">{t('task.priority.critical')}</span>;
  if (priority === 1) return <span className="badge" style={{ background: 'rgba(253,126,20,0.15)', color: '#fd7e14' }}>{t('task.priority.high')}</span>;
  if (priority === 2) return <span className="badge bg-warning-transparent text-warning">{t('task.priority.medium')}</span>;
  if (priority === 3) return <span className="badge bg-success-transparent text-success">{t('task.priority.low')}</span>;
  return <span className="text-muted fs-13">—</span>;
}
