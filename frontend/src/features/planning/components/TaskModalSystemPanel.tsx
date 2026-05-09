import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { useTimezone } from '../../../contexts/TimezoneContext';
import { formatMoment, formatDate } from '../../../lib/dateFormatting';
import { avatarColorFor, initialsOf } from '../../../lib/avatars';
import type { Task } from '../types';

interface Props {
  task: Task;
}

/**
 * Sidebar — Sistema (audit). Colapsável, default fechado.
 *
 * Mostra os 4 campos de auditoria do backend: createdBy, createdAt,
 * updatedBy, updatedAt. `createdBy`/`updatedBy` ficam `—` quando o
 * record é antigo (anterior à migração que adicionou o audit) ou
 * quando o user foi removido (`onDelete: SetNull`).
 */
export function TaskModalSystemPanel({ task }: Props) {
  const { t } = useTranslation('planning');
  const dateFormat = useResolvedDateFormat();
  const tz = useTimezone();
  const [open, setOpen] = useState(false);

  const createdByName = task.createdBy?.name ?? null;
  const updatedByName = task.updatedBy?.name ?? null;
  const createdAt = task.createdAt ?? null;
  const updatedAt = task.updatedAt ?? null;

  return (
    <section className="task-section">
      <button
        type="button"
        className="task-section-collapse-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <h6 className="task-section-title" style={{ margin: 0 }}>
          <i className="ri-information-line" aria-hidden="true" />
          {t('task.system.title')}
        </h6>
        <i
          className={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="system-list" style={{ marginTop: 10 }}>
          <SystemActorRow
            labelKey="task.system.created_by"
            name={createdByName}
            t={t}
          />
          <SystemDateRow
            labelKey="task.system.created_at"
            iso={createdAt}
            tz={tz}
            dateFormat={dateFormat}
            t={t}
          />
          <SystemActorRow
            labelKey="task.system.updated_by"
            name={updatedByName}
            t={t}
          />
          <SystemDateRow
            labelKey="task.system.updated_at"
            iso={updatedAt}
            tz={tz}
            dateFormat={dateFormat}
            t={t}
          />
        </div>
      )}
    </section>
  );
}

function SystemActorRow({
  labelKey,
  name,
  t,
}: {
  labelKey: string;
  name: string | null;
  t: (k: string) => string;
}) {
  return (
    <div className="system-row">
      <span className="system-key">{t(labelKey)}</span>
      <span className="system-value">
        {name ? (
          <>
            <span
              className="avatar avatar-sm"
              style={{ background: avatarColorFor(name) }}
              aria-hidden="true"
            >
              {initialsOf(name)}
            </span>
            {name}
          </>
        ) : (
          <span style={{ color: 'var(--task-muted)' }}>—</span>
        )}
      </span>
    </div>
  );
}

function SystemDateRow({
  labelKey,
  iso,
  tz,
  dateFormat,
  t,
}: {
  labelKey: string;
  iso: string | null;
  tz: string;
  dateFormat: string;
  t: (k: string) => string;
}) {
  return (
    <div className="system-row">
      <span className="system-key">{t(labelKey)}</span>
      <span className="system-value" title={iso ? formatMoment(iso, tz) : ''}>
        {iso ? (
          formatDate(iso, dateFormat)
        ) : (
          <span style={{ color: 'var(--task-muted)' }}>—</span>
        )}
      </span>
    </div>
  );
}
