import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITimesheetApprovalRow } from '../types';
import { TimesheetRejectModal } from './TimesheetRejectModal';
import { avatarColorFor, formatHours, formatWeekRange } from '../dateUtils';
import { confirmAction } from '../../../lib/confirm';

interface Props {
  rows:    ITimesheetApprovalRow[];
  loading: boolean;
  onApprove: (row: ITimesheetApprovalRow) => Promise<boolean>;
  onReject:  (row: ITimesheetApprovalRow, reason: string) => Promise<boolean>;
}

/**
 * Tabela "Para aprovar" — fila de aprovação cross-project.
 * Botões inline [Aprovar] e [Rejeitar] (semana inteira, REQ-GL09/GL10).
 */
export function TimesheetApprovalsTable({ rows, loading, onApprove, onReject }: Props) {
  const { t }  = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  const [rejectTarget, setRejectTarget] = useState<ITimesheetApprovalRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (loading) return <div className="text-center text-muted py-4">{tc('messages.loading')}</div>;
  if (rows.length === 0) return <div className="text-center text-muted py-4">{t('global.empty.no_approvals')}</div>;

  return (
    <>
      <div className="ts-global-table">
        <table>
          <thead>
            <tr>
              <th>{t('global.table.col.user')}</th>
              <th>{t('global.table.col.project')}</th>
              <th>{t('global.table.col.week')}</th>
              <th className="hours">{t('global.table.col.hours')}</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.weekPublicId}>
                <td>
                  <span className="user-cell">
                    <span
                      className="ts-avatar"
                      style={{ background: avatarColorFor(r.user.publicId) }}
                    >{r.user.initials}</span>
                    <span className="nm">{r.user.name}</span>
                  </span>
                </td>
                <td>{r.project.name}</td>
                <td>{formatWeekRange(r.weekStart)}</td>
                <td className="hours">{formatHours(r.totalHours)}</td>
                <td className="actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-success me-2"
                    disabled={busyId === r.weekPublicId}
                    onClick={async () => {
                      const ok = await confirmAction({
                        title:       t('confirm.approve_week.title'),
                        text:        t('confirm.approve_week.text', { user: r.user.name }),
                        confirmText: t('confirm.approve_week.confirm'),
                        cancelText:  tc('actions.cancel'),
                        variant:     'success',
                      });
                      if (!ok) return;
                      setBusyId(r.weekPublicId);
                      await onApprove(r);
                      setBusyId(null);
                    }}
                  >
                    {t('global.action.approve')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={busyId === r.weekPublicId}
                    onClick={() => setRejectTarget(r)}
                  >
                    {t('global.action.reject')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TimesheetRejectModal
        open={!!rejectTarget}
        scope="week"
        subject={rejectTarget
          ? `${rejectTarget.user.name} · ${rejectTarget.project.name} · ${formatWeekRange(rejectTarget.weekStart)}`
          : ''}
        onClose={() => setRejectTarget(null)}
        onSubmit={async (reason) => {
          if (!rejectTarget) return false;
          return onReject(rejectTarget, reason);
        }}
      />
    </>
  );
}
