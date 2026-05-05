import { useTranslation } from 'react-i18next';

export function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation('planning');
  if (type === 'project')
    return <span className="badge bg-secondary-transparent text-secondary fs-11">{t('task.type.project')}</span>;
  if (type === 'milestone')
    return <span className="badge bg-warning-transparent text-warning fs-11">{t('task.type.milestone_label')}</span>;
  return <span className="badge bg-primary-transparent text-primary fs-11">{t('task.type.task')}</span>;
}
