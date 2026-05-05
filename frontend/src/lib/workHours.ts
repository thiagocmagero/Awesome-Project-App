import { ganttToDate, dateToGanttStr } from '../features/planning/ganttDateUtils';

export interface WorkHours {
  start: number; // 0..23
  end:   number; // 1..24
}

const DEFAULT_WH: WorkHours = { start: 9, end: 18 };

function wh(input: WorkHours | null | undefined): WorkHours {
  if (!input) return DEFAULT_WH;
  if (typeof input.start !== 'number' || typeof input.end !== 'number') return DEFAULT_WH;
  if (input.end <= input.start) return DEFAULT_WH;
  return input;
}

/** "DD-MM-YYYY HH:mm" → hora decimal (ex.: "13:30" → 13.5). NaN se inválido. */
export function parseHourFromGantt(s: string): number {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!m) return NaN;
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  return hh + mm / 60;
}

/** Aplica `hour` decimal a uma string wire mantendo a data (dia/mês/ano). */
function withHour(s: string, hourDecimal: number): string {
  const d = ganttToDate(s);
  if (!d) return s;
  const hh = Math.floor(hourDecimal);
  const mm = Math.round((hourDecimal - hh) * 60);
  d.setHours(hh, mm, 0, 0);
  return dateToGanttStr(d);
}

export function isStartWithinWorkHours(
  startStr: string,
  workHours: WorkHours | null | undefined,
): boolean {
  const w = wh(workHours);
  const h = parseHourFromGantt(startStr);
  if (Number.isNaN(h)) return false;
  return h >= w.start && h < w.end;
}

/**
 * Move drag — clamp `start` ao intervalo `[wh.start, wh.end - duration]`.
 * Se `duration` excede a janela diária, clamp apenas a `[wh.start, wh.end - 0.25]`
 * (tarefa multi-dia; backend trata o resto via addBusinessHoursInclusive).
 */
export function clampMoveStart(
  intendedStartStr: string,
  durationHours: number,
  workHours: WorkHours | null | undefined,
): { start: string; clamped: boolean } {
  const w = wh(workHours);
  const dailyHours = w.end - w.start;
  const intendedHour = parseHourFromGantt(intendedStartStr);
  if (Number.isNaN(intendedHour)) return { start: intendedStartStr, clamped: false };

  const fitsInDay = durationHours <= dailyHours;
  const upper = fitsInDay ? w.end - durationHours : w.end - 0.25;

  let target = intendedHour;
  if (target < w.start) target = w.start;
  if (target > upper)  target = upper;

  const clamped = target !== intendedHour;
  if (!clamped) return { start: intendedStartStr, clamped: false };
  return { start: withHour(intendedStartStr, target), clamped: true };
}

/**
 * Right-resize — clamp `end` a `wh.end` (mesmo dia do start).
 * Não ajusta para start em multi-dia; assume single-day para o caso comum.
 */
export function clampResizeRightEnd(
  startStr: string,
  intendedEndStr: string,
  workHours: WorkHours | null | undefined,
): { end: string; clamped: boolean } {
  const w = wh(workHours);
  const startD = ganttToDate(startStr);
  const endD = ganttToDate(intendedEndStr);
  if (!startD || !endD) return { end: intendedEndStr, clamped: false };

  const sameDay =
    startD.getFullYear() === endD.getFullYear() &&
    startD.getMonth() === endD.getMonth() &&
    startD.getDate() === endD.getDate();

  if (!sameDay) return { end: intendedEndStr, clamped: false };

  const intendedEndHour = parseHourFromGantt(intendedEndStr);
  if (Number.isNaN(intendedEndHour)) return { end: intendedEndStr, clamped: false };

  if (intendedEndHour <= w.end) return { end: intendedEndStr, clamped: false };
  return { end: withHour(intendedEndStr, w.end), clamped: true };
}

/**
 * Left-resize — clamp `start` a `wh.start` (mesmo dia do end).
 */
export function clampResizeLeftStart(
  intendedStartStr: string,
  endStr: string,
  workHours: WorkHours | null | undefined,
): { start: string; clamped: boolean } {
  const w = wh(workHours);
  const startD = ganttToDate(intendedStartStr);
  const endD = ganttToDate(endStr);
  if (!startD || !endD) return { start: intendedStartStr, clamped: false };

  const sameDay =
    startD.getFullYear() === endD.getFullYear() &&
    startD.getMonth() === endD.getMonth() &&
    startD.getDate() === endD.getDate();

  if (!sameDay) return { start: intendedStartStr, clamped: false };

  const intendedStartHour = parseHourFromGantt(intendedStartStr);
  if (Number.isNaN(intendedStartHour)) return { start: intendedStartStr, clamped: false };

  if (intendedStartHour >= w.start) return { start: intendedStartStr, clamped: false };
  return { start: withHour(intendedStartStr, w.start), clamped: true };
}

/** Calendar diff entre dois wire strings, em horas. NaN se algum inválido. */
export function calendarHoursBetween(startStr: string, endStr: string): number {
  const s = ganttToDate(startStr);
  const e = ganttToDate(endStr);
  if (!s || !e) return NaN;
  return (e.getTime() - s.getTime()) / 3_600_000;
}
