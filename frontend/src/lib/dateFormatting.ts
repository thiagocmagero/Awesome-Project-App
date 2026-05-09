/**
 * Helpers de formatação de data sensíveis ao formato escolhido por projecto.
 *
 * ─── REGRA PRIMORDIAL — DATAS PURAS vs MOMENTOS REAIS ─────────────────────
 *
 * Este módulo trata DOIS tipos de informação temporal, que NÃO se misturam.
 * Ver docs/claude/timezone.md para tabela completa.
 *
 *   DATA PURA (label de calendário, sem hora):
 *     workDate, weekStart, Project.startDate/endDate, Task.startDate,
 *     HolidayDate.date, TimesheetApprovalLog.scopeDate.
 *     → usar formatDate, formatDateTime, formatDateShort.
 *     → tz-AGNOSTIC. Mostra "dia X" sem conversão.
 *
 *   MOMENTO REAL (instante exacto, com hora):
 *     Notification.createdAt, Session.lastUsedAt, Comment.createdAt,
 *     CalendarEvent.startAt/endAt, audit log createdAt.
 *     → usar formatMoment(input, tz, fmt?), relativeTimeInTimezone(input, tz, t).
 *     → CONVERTE para timezone activa (vem de useTimezone()).
 *
 * Misturar os dois quebra a UX (datas puras a oscilar de dia em dia consoante
 * o fuso) ou perde valor real do timezone (reunião marcada para 14h Lisboa
 * a aparecer como 14h em qualquer fuso).
 *
 * ─── DateFormat ──────────────────────────────────────────────────────────
 *
 * Resolução em runtime (no `useResolvedDateFormat()`):
 *   `project.dateFormat ?? DEFAULT_DATE_FORMAT`
 *
 * Pré-preenchimento ao **criar** um projecto novo: usar `INITIAL_PROJECT_DATE_FORMAT`.
 * Esta constante existe separada de `DEFAULT_DATE_FORMAT` para que, quando a
 * config user-level chegar no futuro, só este single call-site mude (passa a
 * `getInitialProjectDateFormat(user)`).
 */

import { format as formatTz } from 'date-fns-tz';
import type { TFunction } from 'i18next';

export type ProjectDateFormat =
  | 'DD/MM/YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY-MM-DD'
  | 'MM/DD/YYYY';

export const DEFAULT_DATE_FORMAT: ProjectDateFormat = 'DD/MM/YYYY';

/**
 * Default usado APENAS no pré-preenchimento do form de criação de projecto.
 * Não usar para fallback de visualização (esse é `DEFAULT_DATE_FORMAT`).
 *
 * Quando a config user-level for adicionada, este valor passa a derivar do
 * perfil do utilizador autenticado em vez de constante.
 */
export const INITIAL_PROJECT_DATE_FORMAT: ProjectDateFormat = 'DD/MM/YYYY';

export interface DateFormatOption {
  value: ProjectDateFormat;
  /** Sufixo da chave i18n: `date_format.<key>` em namespace `projects`. */
  i18nKey: 'dmy_slash' | 'dmy_dash' | 'iso' | 'mdy_slash';
  /** Exemplo curto exibido ao lado do label no select. */
  example: string;
}

export const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
  { value: 'DD/MM/YYYY', i18nKey: 'dmy_slash', example: '31/12/2025' },
  { value: 'DD-MM-YYYY', i18nKey: 'dmy_dash',  example: '31-12-2025' },
  { value: 'YYYY-MM-DD', i18nKey: 'iso',        example: '2025-12-31' },
  { value: 'MM/DD/YYYY', i18nKey: 'mdy_slash', example: '12/31/2025' },
];

// ── Internal: parse Date | string | null | undefined → Date | null ──────────

function toDate(input: Date | string | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  // Suporta ISO 8601 ('2025-12-31', '2025-12-31T10:30:00Z') e o formato
  // interno DHTMLX ('DD-MM-YYYY HH:mm').
  const s = String(input).trim();
  if (!s) return null;
  // DHTMLX wire format
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) {
    const [, dd, mm, yyyy, hh = '00', min = '00'] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// ── Public formatters ──────────────────────────────────────────────────────

/**
 * Formata uma data segundo o formato dado (ou o default platform-wide).
 * Devolve `'—'` se a data for nula/inválida.
 */
export function formatDate(
  input: Date | string | null | undefined,
  fmt?: ProjectDateFormat | string | null,
): string {
  const d = toDate(input);
  if (!d) return '—';
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const f = (fmt as ProjectDateFormat) ?? DEFAULT_DATE_FORMAT;
  switch (f) {
    case 'DD-MM-YYYY': return `${dd}-${mm}-${yyyy}`;
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY':
    default:           return `${dd}/${mm}/${yyyy}`;
  }
}

/** `formatDate` + ` HH:mm` (24h). */
export function formatDateTime(
  input: Date | string | null | undefined,
  fmt?: ProjectDateFormat | string | null,
): string {
  const d = toDate(input);
  if (!d) return '—';
  const datePart = formatDate(d, fmt);
  return `${datePart} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Versão curta sem ano — usada nos cabeçalhos da grelha do Timesheet
 * (largura limitada). Mantém o separador e a ordem dia/mês do formato escolhido.
 */
export function formatDateShort(
  input: Date | string | null | undefined,
  fmt?: ProjectDateFormat | string | null,
): string {
  const d = toDate(input);
  if (!d) return '—';
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const f = (fmt as ProjectDateFormat) ?? DEFAULT_DATE_FORMAT;
  switch (f) {
    case 'DD-MM-YYYY': return `${dd}-${mm}`;
    case 'YYYY-MM-DD': return `${mm}-${dd}`;
    case 'MM/DD/YYYY': return `${mm}/${dd}`;
    case 'DD/MM/YYYY':
    default:           return `${dd}/${mm}`;
  }
}

// ── Conversores para widgets externos ───────────────────────────────────────

/** Converte para a sintaxe FlatPickr (`d/m/Y`, `Y-m-d`, ...). */
export function toFlatpickrFormat(
  fmt?: ProjectDateFormat | string | null,
  withTime?: boolean,
): string {
  const f = (fmt as ProjectDateFormat) ?? DEFAULT_DATE_FORMAT;
  let base: string;
  switch (f) {
    case 'DD-MM-YYYY': base = 'd-m-Y'; break;
    case 'YYYY-MM-DD': base = 'Y-m-d'; break;
    case 'MM/DD/YYYY': base = 'm/d/Y'; break;
    case 'DD/MM/YYYY':
    default:           base = 'd/m/Y';
  }
  return withTime ? `${base} H:i` : base;
}

/** Converte para a sintaxe DHTMLX Gantt/Kanban (`%d/%m/%Y`, `%Y-%m-%d`, ...). */
export function toGanttFormat(
  fmt?: ProjectDateFormat | string | null,
  withTime?: boolean,
): string {
  const f = (fmt as ProjectDateFormat) ?? DEFAULT_DATE_FORMAT;
  let base: string;
  switch (f) {
    case 'DD-MM-YYYY': base = '%d-%m-%Y'; break;
    case 'YYYY-MM-DD': base = '%Y-%m-%d'; break;
    case 'MM/DD/YYYY': base = '%m/%d/%Y'; break;
    case 'DD/MM/YYYY':
    default:           base = '%d/%m/%Y';
  }
  return withTime ? `${base} %H:%i` : base;
}

// ── MOMENTOS REAIS — converte para timezone activa antes de formatar ────────

/**
 * Converte um padrão de `dateFormat` da app para o equivalente no `date-fns`.
 *
 * `date-fns` usa Unicode TR35 (LDML): `yyyy-MM-dd HH:mm` (24h pelo HH).
 */
function toDateFnsPattern(
  fmt?: ProjectDateFormat | string | null,
  withTime = true,
): string {
  const f = (fmt as ProjectDateFormat) ?? DEFAULT_DATE_FORMAT;
  let base: string;
  switch (f) {
    case 'DD-MM-YYYY': base = 'dd-MM-yyyy'; break;
    case 'YYYY-MM-DD': base = 'yyyy-MM-dd'; break;
    case 'MM/DD/YYYY': base = 'MM/dd/yyyy'; break;
    case 'DD/MM/YYYY':
    default:           base = 'dd/MM/yyyy';
  }
  return withTime ? `${base} HH:mm` : base;
}

/**
 * Formata um MOMENTO REAL (instante UTC) na timezone activa.
 *
 * Usar APENAS para campos com hora real: Notification.createdAt,
 * Session.lastUsedAt, Comment.createdAt, CalendarEvent.startAt/endAt,
 * audit logs. NUNCA para datas puras (workDate, weekStart, etc.) — para
 * essas, usar `formatDate(d, dateFormat)`.
 *
 * `tz` vem do `useTimezone()` hook. `dateFormat` (opcional) controla a parte
 * de data; sem ele, default platform-wide.
 *
 * @param input  Date | ISO string | null
 * @param tz     IANA timezone identifier (ex.: 'Europe/Lisbon')
 * @param dateFormat  formato da data (default platform-wide)
 * @param withTime    incluir parte horária (default true)
 */
export function formatMoment(
  input: Date | string | null | undefined,
  tz: string,
  dateFormat?: ProjectDateFormat | string | null,
  withTime = true,
): string {
  const d = toDate(input);
  if (!d) return '—';
  try {
    return formatTz(d, toDateFnsPattern(dateFormat, withTime), { timeZone: tz });
  } catch {
    return '—';
  }
}

/**
 * Relative time tz-aware ("há 5 minutos") com fallback absoluto na timezone
 * activa para datas antigas (>30 dias).
 *
 * A diferença em ms é tz-agnostic (Date.now() e new Date(input) ambos UTC),
 * portanto a parte "há X minutos" não depende da timezone. A `tz` é usada
 * apenas no fallback absoluto.
 *
 * Chaves i18n esperadas (namespace `common`):
 *   time.now, time.minutes_ago, time.hours_ago, time.days_ago
 */
export function relativeTimeInTimezone(
  input: Date | string | null | undefined,
  tz: string,
  t: TFunction,
  dateFormat?: ProjectDateFormat | string | null,
): string {
  const d = toDate(input);
  if (!d) return '—';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t('common:time.now');
  if (diffMin < 60) return t('common:time.minutes_ago', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('common:time.hours_ago', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return t('common:time.days_ago', { count: diffD });
  // Fallback: data absoluta na tz activa
  return formatMoment(d, tz, dateFormat, true);
}
