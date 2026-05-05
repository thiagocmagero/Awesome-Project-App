import { useTranslation } from 'react-i18next';
import type { ITimesheetTeamRow } from '../types';
import { TimesheetStatusPill } from './TimesheetStatusPill';
import { confirmAction } from '../../../lib/confirm';
import { avatarColorFor, formatHours, formatWeekRange, parseISODate } from '../dateUtils';

interface Props {
  row:           ITimesheetTeamRow;
  weekStart:     string;
  /** True quando há ≥1 dia SUBMITTED na semana — gestor pode aprovar/rejeitar. */
  hasSubmittedDays: boolean;
  /** True quando a semana já tem ≥1 dia APPROVED ou REJECTED — gestor pode "Editar". */
  hasFinalisedDays: boolean;
  onApproveWeek:  () => void;
  onApproveMonth: (year: number, month: number) => void;
  onRejectDay:    () => void;
  onRevertWeek:   () => void;
  onRevertMonth:  (year: number, month: number) => void;
  onOpenHistory:  () => void;
}

/**
 * Card de header da pessoa seleccionada — vista do gestor dentro do projecto.
 *
 * Lógica dos botões (Abril 2026):
 * - Quando `hasSubmittedDays` (semana=SUBMITTED): mostra Aprovar semana / Aprovar mês / Rejeitar dia(s).
 * - Quando `hasFinalisedDays` (semana=APPROVED/REJECTED/PARTIAL): mostra Editar aprovação semana / mês.
 * - Os dois conjuntos são mutuamente exclusivos no mesmo momento (nova semântica:
 *   PARTIAL = APPROVED+REJECTED apenas, sem SUBMITTED). A excepção é durante uma
 *   transição muito rara em que ambos coexistem — nesse caso mostramos os dois.
 *
 * Histórico fica sempre disponível.
 */
export function TimesheetTeamPersonHeader({
  row, weekStart, hasSubmittedDays, hasFinalisedDays,
  onApproveWeek, onApproveMonth, onRejectDay,
  onRevertWeek, onRevertMonth,
  onOpenHistory,
}: Props) {
  const { t }     = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  const monthStart = parseISODate(weekStart);
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth() + 1;

  async function handleApproveWeek() {
    const ok = await confirmAction({
      title:       t('confirm.approve_week.title'),
      text:        t('confirm.approve_week.text', { user: row.user.name }),
      confirmText: t('confirm.approve_week.confirm'),
      cancelText:  tc('actions.cancel'),
      variant:     'success',
    });
    if (ok) onApproveWeek();
  }

  async function handleApproveMonth() {
    const ok = await confirmAction({
      title:       t('confirm.approve_month.title'),
      text:        t('confirm.approve_month.text', { user: row.user.name }),
      confirmText: t('confirm.approve_month.confirm'),
      cancelText:  tc('actions.cancel'),
      variant:     'success',
    });
    if (ok) onApproveMonth(year, month);
  }

  async function handleRevertWeek() {
    const ok = await confirmAction({
      title:       t('confirm.edit_week.title'),
      text:        t('confirm.edit_week.text', { user: row.user.name }),
      confirmText: t('confirm.edit_week.confirm'),
      cancelText:  tc('actions.cancel'),
      variant:     'warning',
    });
    if (ok) onRevertWeek();
  }

  async function handleRevertMonth() {
    const ok = await confirmAction({
      title:       t('confirm.edit_month.title'),
      text:        t('confirm.edit_month.text', { user: row.user.name }),
      confirmText: t('confirm.edit_month.confirm'),
      cancelText:  tc('actions.cancel'),
      variant:     'warning',
    });
    if (ok) onRevertMonth(year, month);
  }

  return (
    <>
      <div className="ts-person-summary">
        <span
          className="ts-avatar"
          style={{ background: avatarColorFor(row.user.publicId) }}
        >{row.user.initials}</span>
        <div className="info">
          <div className="nm">{row.user.name}</div>
          <div className="sub">
            {t('team.summary.week_logged_hours', {
              range:  formatWeekRange(weekStart),
              hours:  formatHours(row.totalHours),
            })}
          </div>
        </div>
        <TimesheetStatusPill status={row.status} />
      </div>

      <div className="ts-team-actions">
        {/* Acções primárias — só quando há dias SUBMITTED para tratar */}
        {hasSubmittedDays && (
          <>
            <button type="button" className="ts-btn-action ts-btn-action--approve" onClick={handleApproveWeek}>
              <i className="ri-check-line" />
              <span>{t('team.action.approve_week')}</span>
            </button>
            <button type="button" className="ts-btn-action ts-btn-action--approve" onClick={handleApproveMonth}>
              <i className="ri-calendar-check-line" />
              <span>{t('team.action.approve_month')}</span>
            </button>
            <button type="button" className="ts-btn-action ts-btn-action--reject" onClick={onRejectDay}>
              <i className="ri-close-line" />
              <span>{t('team.action.reject_day')}</span>
            </button>
          </>
        )}

        {/* Acções de "Editar" — só quando já existem decisões finais (APPROVED/REJECTED) */}
        {hasFinalisedDays && !hasSubmittedDays && (
          <>
            <button type="button" className="ts-btn-action ts-btn-action--edit" onClick={handleRevertWeek}>
              <i className="ri-edit-2-line" />
              <span>{t('team.action.edit_week')}</span>
            </button>
            <button type="button" className="ts-btn-action ts-btn-action--edit" onClick={handleRevertMonth}>
              <i className="ri-calendar-event-line" />
              <span>{t('team.action.edit_month')}</span>
            </button>
          </>
        )}

        <button type="button" className="ts-btn-action ts-btn-action--ghost ms-auto" onClick={onOpenHistory}>
          <i className="ri-history-line" />
          <span>{t('team.action.history')}</span>
        </button>
      </div>
    </>
  );
}
