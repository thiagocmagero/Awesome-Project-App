import { useTranslation } from 'react-i18next';
import type { ITimesheetDay } from '../types';
import { dayOfWeekLabelPT, formatDayShort } from '../dateUtils';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';

interface Props {
  days: ITimesheetDay[];
}

/**
 * Banner vermelho abaixo da grelha — REQ-G11. Lista os dias rejeitados
 * com motivo. Renderiza apenas se houver ≥1 dia rejeitado.
 */
export function TimesheetRejectionBanner({ days }: Props) {
  const { t } = useTranslation('timesheet');
  const dateFormat = useResolvedDateFormat();

  const rejected = days.filter((d) => d.status === 'REJECTED' && d.rejectionReason);
  if (rejected.length === 0) return null;

  return (
    <>
      {rejected.map((d) => (
        <div key={d.publicId} className="ts-rejection">
          <strong>
            {t('rejection_banner.label', {
              day: `${dayOfWeekLabelPT(d.workDate)} ${formatDayShort(d.workDate, dateFormat)}`,
            })}
            :
          </strong>
          &nbsp;&ldquo;{d.rejectionReason}&rdquo;
        </div>
      ))}
    </>
  );
}
