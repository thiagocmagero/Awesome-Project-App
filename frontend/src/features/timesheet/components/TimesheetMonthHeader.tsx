import { useTranslation } from 'react-i18next';
import type { ITimesheetMonthBundle, ITimesheetTeamRow } from '../types';
import { TimesheetStatusPill } from './TimesheetStatusPill';
import { avatarColorFor, formatHours, formatWeekRange } from '../dateUtils';
import { formatDate } from '../../../lib/dateFormatting';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';

interface Props {
  /** Linha da equipa do user seleccionado (modo individual). null = vista agregada. */
  selectedRow: ITimesheetTeamRow | null;
  /** Bundle da vista mensal — fornece `totalHours` e `project.startDate/endDate`. */
  monthData:   ITimesheetMonthBundle;
  /** Semana actual da vista (usada na descrição do user em modo individual). */
  weekStart:   string;
}

/**
 * Header da vista mensal — duas variantes:
 *
 *  1. **Vista agregada** (selectedRow=null): card com avatar "TEAM",
 *     título "Vista agregada", total de horas lançadas pela equipa no
 *     projecto + período do projecto.
 *
 *  2. **Vista individual** (selectedRow != null): card com avatar do user,
 *     nome, total de horas lançadas pelo user no projecto + período.
 *     **Sem botões de aprovação** — essas acções só aparecem na vista
 *     semanal porque dependem do estado dos dias da semana actual.
 */
export function TimesheetMonthHeader({ selectedRow, monthData, weekStart }: Props) {
  const { t } = useTranslation('timesheet');
  const dateFormat = useResolvedDateFormat();

  const period = monthData.project.startDate && monthData.project.endDate
    ? t('month.project_period', {
        start: formatDate(monthData.project.startDate, dateFormat),
        end:   formatDate(monthData.project.endDate,   dateFormat),
      })
    : t('month.project_period_undefined');

  if (selectedRow) {
    return (
      <div className="ts-person-summary">
        <span
          className="ts-avatar"
          style={{ background: avatarColorFor(selectedRow.user.publicId) }}
        >{selectedRow.user.initials}</span>
        <div className="info">
          <div className="nm">{selectedRow.user.name}</div>
          <div className="sub">
            {/* Em individual mostramos: total no projecto · período. A semana
               actual aparece também (útil quando o gestor faz drill-down).
               `zeroAsDash:false` → quando user ainda não lançou nada mostra "0h"
               em vez de "–" (que sugeriria ausência de dados). */}
            {t('month.user_summary', {
              hours:  formatHours(monthData.totalHours, { zeroAsDash: false }),
              range:  formatWeekRange(weekStart),
            })}
          </div>
          <div className="sub">{period}</div>
        </div>
        <TimesheetStatusPill status={selectedRow.status} />
      </div>
    );
  }

  return (
    <div className="ts-person-summary ts-person-summary--aggregate">
      <span className="ts-avatar ts-avatar--aggregate">
        <i className="ri-team-line" />
      </span>
      <div className="info">
        <div className="nm">{t('month.aggregated_title')}</div>
        <div className="sub">
          {/* `zeroAsDash:false` — quando a equipa ainda não lançou nada, mostra
             "0h" em vez de "–" (semanticamente diferente de "sem dados"). */}
          {t('month.aggregate_total_hours', { hours: formatHours(monthData.totalHours, { zeroAsDash: false }) })}
        </div>
        <div className="sub">{period}</div>
      </div>
    </div>
  );
}
