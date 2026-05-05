/**
 * Helpers de datas para o Timesheet.
 * Convenções:
 *  - ISO date strings: 'YYYY-MM-DD' (sem tempo, sem timezone).
 *  - "weekStart" = segunda-feira UTC (ISO 8601).
 *  - Datas em string são tratadas como UTC para evitar drift por TZ local.
 */

// Always UTC midnight, regardless of project/user timezone. Pure date helpers.
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map((s) => parseInt(s, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * "Hoje" no timezone indicado, devolvido como Date UTC midnight do dia X.
 * Usado por currentWeekStart, currentMonthIso e isTodayISO para evitar o bug
 * de "perto da meia-noite UTC, em fusos negativos, o `now.getDate()` local
 * diverge do dia real do utilizador". Ver docs/claude/timezone.md.
 *
 * Default tz = 'UTC' preserva comportamento legacy quando o caller não tem
 * contexto.
 */
function todayInTimezone(tz?: string): Date {
  const targetTz = tz || 'UTC';
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const isoLike = fmt.format(new Date()); // 'YYYY-MM-DD'
    return parseISODate(isoLike);
  } catch {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatISODate(d);
}

/** Retorna a segunda-feira UTC (ISO 8601) da semana que contém esta data. */
export function weekStartOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

export function weekStartOfISO(iso: string): string {
  return formatISODate(weekStartOf(parseISODate(iso)));
}

/**
 * Devolve weekStart UTC da semana que contém "hoje" na `tz` indicada.
 * Sem `tz`, default UTC (legacy). Em PlanningPage usar `useTimezone()`.
 */
export function currentWeekStart(tz?: string): string {
  return formatISODate(weekStartOf(todayInTimezone(tz)));
}

/** Lista de 7 ISO dates Mon..Sun a partir de weekStart. */
export function daysOfWeek(weekStartIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStartIso, i));
}

/** Formato "14 abr – 20 abr 2025" (locale-aware via Intl quando possível). */
export function formatWeekRange(weekStartIso: string, locale = 'pt-PT'): string {
  const start = parseISODate(weekStartIso);
  const end = parseISODate(addDaysISO(weekStartIso, 6));
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const startMonth = monthFmt.format(start).replace('.', '');
  const endMonth   = monthFmt.format(end).replace('.', '');
  const startStr = `${start.getUTCDate()} ${startMonth}`;
  const endStr   = `${end.getUTCDate()} ${endMonth}`;
  const year = end.getUTCFullYear();
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCDate()} – ${end.getUTCDate()} ${endMonth} ${year}`;
  }
  return `${startStr} – ${endStr} ${year}`;
}

/**
 * Formato "14/04" para cabeçalho de coluna (sem ano — largura limitada).
 * `dateFormat` controla ordem dia/mês e separador conforme o projecto:
 * - DD/MM/YYYY → "14/04"
 * - DD-MM-YYYY → "14-04"
 * - YYYY-MM-DD → "04-14" (mês primeiro, separador da config)
 * - MM/DD/YYYY → "04/14"
 */
export function formatDayShort(iso: string, dateFormat?: string): string {
  const d = parseISODate(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  switch (dateFormat) {
    case 'DD-MM-YYYY': return `${dd}-${mm}`;
    case 'YYYY-MM-DD': return `${mm}-${dd}`;
    case 'MM/DD/YYYY': return `${mm}/${dd}`;
    case 'DD/MM/YYYY':
    default:           return `${dd}/${mm}`;
  }
}

/** Iniciais (Mon, Tue) abreviadas em PT — Seg, Ter, Qua, Qui, Sex, Sáb, Dom */
const PT_DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export function dayOfWeekLabelPT(iso: string): string {
  const d = parseISODate(iso);
  return PT_DOW[d.getUTCDay()];
}

/**
 * Verifica se ISO date == "hoje" na `tz` indicada (default UTC).
 * Em PlanningPage usar `useTimezone()` para alinhar com o destaque visual
 * do dia actual no fuso do projecto.
 */
export function isTodayISO(iso: string, tz?: string): boolean {
  return iso === formatISODate(todayInTimezone(tz));
}

/**
 * Formata horas para display: "12h", "1.5h", "0.5h".
 *
 * Por defeito (`zeroAsDash: true`) trata `0`/`null`/`undefined` como vazio
 * (`–`). Útil para células da grelha onde o utilizador ainda não lançou
 * nada — visualmente limpo.
 *
 * Para campos de **resumo** (ex.: "X lançadas neste projeto") onde 0 é um
 * valor real e relevante, usar `formatHours(h, { zeroAsDash: false })` →
 * devolve `"0h"`.
 */
export function formatHours(
  h: number | null | undefined,
  opts: { zeroAsDash?: boolean } = {},
): string {
  const zeroAsDash = opts.zeroAsDash ?? true;
  if (h === null || h === undefined) return '–';
  if (h === 0) return zeroAsDash ? '–' : '0h';
  // 1 casa decimal apenas se necessária
  if (Number.isInteger(h)) return `${h}h`;
  return `${h.toFixed(1)}h`;
}

const AVATAR_PALETTE = ['#845adf', '#23b7e5', '#26bf94', '#f5b849', '#49b6f5', '#e6533c'];

export function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/**
 * Devolve o mês actual em formato 'YYYY-MM' na `tz` indicada (default UTC).
 * Em PlanningPage usar `useTimezone()` para nav mensal alinhada com o fuso
 * do projecto.
 */
export function currentMonthIso(tz?: string): string {
  const d = todayInTimezone(tz);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' → mês anterior 'YYYY-MM'. */
export function prevMonthIso(monthIso: string): string {
  const [y, m] = monthIso.split('-').map((s) => parseInt(s, 10));
  const newM = m === 1 ? 12 : m - 1;
  const newY = m === 1 ? y - 1 : y;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/** 'YYYY-MM' → mês seguinte 'YYYY-MM'. */
export function nextMonthIso(monthIso: string): string {
  const [y, m] = monthIso.split('-').map((s) => parseInt(s, 10));
  const newM = m === 12 ? 1 : m + 1;
  const newY = m === 12 ? y + 1 : y;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/** Formato "Abril 2025" — locale-aware. */
export function formatMonthLong(monthIso: string, locale = 'pt-PT'): string {
  const [y, m] = monthIso.split('-').map((s) => parseInt(s, 10));
  const d = new Date(Date.UTC(y, m - 1, 1));
  const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const out = fmt.format(d);
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Mês contendo a weekStart (segunda-feira). Convenção: usa o mês da segunda-feira. */
export function monthIsoOfWeek(weekStartIso: string): string {
  const [y, m] = weekStartIso.split('-').map((s) => parseInt(s, 10));
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Verifica se um determinado mês ('YYYY-MM') está dentro do intervalo do projecto.
 * Usado para desabilitar prev/next nos limites do projecto.
 */
export function monthIsoWithinProject(
  monthIso: string,
  projectStart: string | null,
  projectEnd: string | null,
): boolean {
  if (!projectStart && !projectEnd) return true;
  const [y, m] = monthIso.split('-').map((s) => parseInt(s, 10));
  const monthFirst = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthLast = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  if (projectStart && monthLast < projectStart) return false;
  if (projectEnd && monthFirst > projectEnd) return false;
  return true;
}
