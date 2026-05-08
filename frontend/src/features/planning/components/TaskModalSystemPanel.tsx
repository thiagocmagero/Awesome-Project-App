import { useTranslation } from 'react-i18next';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { useTimezone } from '../../../contexts/TimezoneContext';
import { formatMoment, formatDate } from '../../../lib/dateFormatting';
import { avatarColorFor, initialsOf } from '../../../lib/avatars';
import type { GanttTask } from '../types';

interface Props {
  task: GanttTask;
}

/**
 * Sidebar — Sistema. Apenas Criada por (mock até schema) e Criada em.
 *
 * `createdAt` vem agora do backend (serializeTask retorna o ISO string).
 * "Criada por" continua mock "—" até o schema GanttTask expor `createdById`.
 * O ID interno foi removido por decisão UX (Maio 2026).
 */
export function TaskModalSystemPanel({ task }: Props) {
  const { t } = useTranslation('planning');
  const dateFormat = useResolvedDateFormat();
  const tz = useTimezone();

  const createdByName: string | null = null; // schema sem createdById ainda
  const createdAt = task.createdAt ?? null;

  return (
    <section className="task-section">
      <h6 className="task-section-title">
        <i className="ri-information-line" aria-hidden="true" />
        {t('task.system.title')}
      </h6>
      <div className="system-list">
        <div className="system-row">
          <span className="system-key">{t('task.system.created_by')}</span>
          <span className="system-value">
            {createdByName ? (
              <>
                <span
                  className="avatar avatar-sm"
                  style={{ background: avatarColorFor(createdByName) }}
                  aria-hidden="true"
                >
                  {initialsOf(createdByName)}
                </span>
                {createdByName}
              </>
            ) : (
              <span style={{ color: 'var(--task-muted)' }}>—</span>
            )}
          </span>
        </div>
        <div className="system-row">
          <span className="system-key">{t('task.system.created_at')}</span>
          <span className="system-value" title={createdAt ? formatMoment(createdAt, tz) : ''}>
            {createdAt ? formatDate(createdAt, dateFormat) : <span style={{ color: 'var(--task-muted)' }}>—</span>}
          </span>
        </div>
      </div>
    </section>
  );
}
