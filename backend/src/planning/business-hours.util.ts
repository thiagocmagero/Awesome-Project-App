/**
 * Helper de cálculo de endDate para Task com `durationUnit = HOUR`.
 *
 * Análogo a `addBusinessDaysInclusive`, mas em granularidade horária.
 * Respeita:
 *   - `workHours.start..workHours.end` (janela diária útil em formato 24h, ex.: 9..18)
 *   - dias não-úteis (sábado, domingo, holidays do projecto via `nonWorkingSet`)
 * Cálculos em UTC puro — "9:00" = 9:00 UTC.
 *
 * Edge cases:
 *   - durationHours <= 0 → return clone de start (milestone-safe)
 *   - start fora da janela (ex.: 07:00 com workHours 9..18) → cursor avança
 *     para a próxima abertura útil (mesmo dia 09:00 ou próximo dia útil)
 *   - cross-day, cross-weekend, cross-holiday: salta automaticamente
 *
 * Ver docs/claude/tools/gantt/data-model.md.
 */

export interface WorkHours {
  start: number; // 0..23
  end:   number; // 1..24, > start
}

export const DEFAULT_WORK_HOURS: WorkHours = { start: 9, end: 18 };

export function addBusinessHoursInclusive(
  start: Date,
  durationHours: number,
  workHours: WorkHours,
  nonWorkingSet: Set<string>,
): Date {
  if (durationHours <= 0) return new Date(start.getTime());

  const dailyHours = workHours.end - workHours.start;
  if (dailyHours <= 0) {
    return new Date(start.getTime());
  }

  let cursor = new Date(start.getTime());

  cursor = nextWorkingMoment(cursor, workHours, nonWorkingSet);

  let remainingMs = durationHours * 3_600_000;
  let iterations = 0;
  const MAX_ITERATIONS = 10000;

  while (remainingMs > 0) {
    if (++iterations > MAX_ITERATIONS) {
      return new Date(start.getTime());
    }
    const windowEnd = endOfDailyWindow(cursor, workHours);
    const availableMs = windowEnd - cursor.getTime();

    if (availableMs >= remainingMs) {
      return new Date(cursor.getTime() + remainingMs);
    }

    remainingMs -= availableMs;
    cursor = new Date(windowEnd);
    cursor = nextWorkingMoment(cursor, workHours, nonWorkingSet);
  }

  return cursor;
}

function nextWorkingMoment(
  cursor: Date,
  workHours: WorkHours,
  nonWorkingSet: Set<string>,
): Date {
  let c = new Date(cursor.getTime());
  let iterations = 0;
  const MAX_ITERATIONS = 5000;

  while (true) {
    if (++iterations > MAX_ITERATIONS) {
      return c;
    }
    if (isNonWorkingDay(c, nonWorkingSet)) {
      c = nextDayAt(c, workHours.start);
      continue;
    }
    const hour = c.getUTCHours() + c.getUTCMinutes() / 60 + c.getUTCSeconds() / 3600;
    if (hour < workHours.start) {
      c = sameDayAt(c, workHours.start);
      continue;
    }
    if (hour >= workHours.end) {
      c = nextDayAt(c, workHours.start);
      continue;
    }
    return c;
  }
}

function isNonWorkingDay(d: Date, nonWorkingSet: Set<string>): boolean {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return true;
  return nonWorkingSet.has(formatYMD(d));
}

function sameDayAt(d: Date, hour: number): Date {
  const hh = Math.floor(hour);
  const mm = Math.round((hour % 1) * 60);
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    hh,
    mm,
  ));
}

function nextDayAt(d: Date, hour: number): Date {
  const hh = Math.floor(hour);
  const mm = Math.round((hour % 1) * 60);
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    hh,
    mm,
  ));
}

function endOfDailyWindow(cursor: Date, workHours: WorkHours): number {
  const dayStart = new Date(Date.UTC(
    cursor.getUTCFullYear(),
    cursor.getUTCMonth(),
    cursor.getUTCDate(),
  ));
  return dayStart.getTime() + workHours.end * 3_600_000;
}

function formatYMD(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
