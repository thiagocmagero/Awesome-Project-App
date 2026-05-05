import { useTranslation } from 'react-i18next';
import type { TimesheetWeekStatus, TimesheetDayStatus } from '../types';

type AnyStatus = TimesheetWeekStatus | TimesheetDayStatus;

interface Props {
  status: AnyStatus;
  size?: 'md' | 'xs';
  /** Override do label — útil em listas de pessoas onde mostramos só o estado curto */
  labelOverride?: string;
}

/** Pill colorida por estado (DRAFT/SUBMITTED/PARTIAL/APPROVED/REJECTED). */
export function TimesheetStatusPill({ status, size = 'md', labelOverride }: Props) {
  const { t } = useTranslation('timesheet');
  const cls = `ts-pill ts-pill--${status.toLowerCase()}${size === 'xs' ? ' ts-pill--xs' : ''}`;
  const label = labelOverride ?? t(`status.${status.toLowerCase()}` as 'status.draft');
  return <span className={cls}>{label}</span>;
}
