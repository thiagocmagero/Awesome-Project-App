import { HttpStatus } from '@nestjs/common';
import { GanttTaskDurationUnit } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { WorkHours, DEFAULT_WORK_HOURS } from './business-hours.util';

/**
 * Default usado no fallback quando `PlatformLimits` não está populado.
 * Equivale a ≈5 anos calendário em dias úteis.
 */
export const DEFAULT_MAX_TASK_BUSINESS_DAYS = 1300;

/**
 * Cap unificado de duração de uma `GanttTask`. Tasks HOUR convertem-se em
 * dias úteis equivalentes via `dailyHours = workHours.end - workHours.start`.
 *
 * Lança `TASK_DURATION_EXCEEDS_LIMIT` (400) se exceder.
 *
 * Substitui o cap genérico anterior `duration > 1000` (que era arbitrário e
 * incoerente entre unidades). O valor de `maxBusinessDays` vem do singleton
 * `PlatformLimits` (configurável só por PLATFORM_ADMIN).
 *
 * Edge cases:
 *  - duration <= 0 → return (milestone-safe).
 *  - workHours inválido (end-start <= 0) → fallback `DEFAULT_WORK_HOURS`.
 *
 * Ver docs/claude/tools/gantt/data-model.md.
 */
export function assertTaskDurationWithinLimit(
  duration: number,
  unit: GanttTaskDurationUnit,
  workHours: WorkHours | null | undefined,
  maxBusinessDays: number,
): void {
  if (duration <= 0) return;

  const wh = workHours && workHours.end > workHours.start
    ? workHours
    : DEFAULT_WORK_HOURS;
  const dailyHours = Math.max(1, wh.end - wh.start);

  const equivalentBusinessDays = unit === GanttTaskDurationUnit.HOUR
    ? duration / dailyHours
    : duration;

  if (equivalentBusinessDays > maxBusinessDays) {
    throw new AppException(
      'TASK_DURATION_EXCEEDS_LIMIT',
      HttpStatus.BAD_REQUEST,
    );
  }
}
