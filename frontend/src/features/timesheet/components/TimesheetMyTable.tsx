import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ITimesheetMyRow } from '../types';
import { TimesheetStatusPill } from './TimesheetStatusPill';
import { formatHours, formatWeekRange } from '../dateUtils';

interface Props {
  rows:    ITimesheetMyRow[];
  loading: boolean;
}

/**
 * Tabela "As minhas" — semanas próprias em todos os projectos.
 * Botão [Abrir] navega para /projects/:id/planning?tab=timesheet&week=YYYY-MM-DD.
 */
export function TimesheetMyTable({ rows, loading }: Props) {
  const { t }  = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  if (loading) return <div className="text-center text-muted py-4">{tc('messages.loading')}</div>;
  if (rows.length === 0) return <div className="text-center text-muted py-4">{t('global.empty.no_my')}</div>;

  return (
    <div className="ts-global-table">
      <table>
        <thead>
          <tr>
            <th>{t('global.table.col.project')}</th>
            <th>{t('global.table.col.week')}</th>
            <th>{t('global.table.col.state')}</th>
            <th className="hours">{t('global.table.col.hours')}</th>
            <th className="actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.weekPublicId}>
              <td>{r.project.name}</td>
              <td>{formatWeekRange(r.weekStart)}</td>
              <td><TimesheetStatusPill status={r.status} /></td>
              <td className="hours">{formatHours(r.totalHours)}</td>
              <td className="actions">
                <Link
                  className="btn btn-sm btn-outline-secondary"
                  to={`/projects/${encodeURIComponent(r.project.publicId)}/planning?tab=timesheet&week=${encodeURIComponent(r.weekStart)}`}
                >
                  {t('global.action.open')}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
