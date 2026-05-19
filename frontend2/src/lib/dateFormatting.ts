/**
 * Helpers de formatação de datas para frontend2.
 *
 * Distinção crítica (regra obrigatória de timezone):
 *   - DATA PURA (label de calendário) → `formatDate(d, fmt)` — tz-agnostic.
 *   - MOMENTO REAL (instante exacto) → `formatMoment(d, tz)` — tz-aware.
 *
 * `formatMoment` + `relativeTimeInTimezone` adicionados em Mai 2026 para
 * suporte ao CommentsPanel (comments.createdAt é MOMENTO REAL).
 */

/** Formatos de data suportados ao nível do projecto. Sincronizado com
 *  `frontend/src/lib/dateFormatting.ts` (legacy) e a regra
 *  @docs/claude/date-formatting.md. */
export type ProjectDateFormat =
  | 'DD/MM/YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY-MM-DD'
  | 'MM/DD/YYYY';

/** Default platform-wide quando o projecto não tem `dateFormat` definido. */
export const DEFAULT_DATE_FORMAT: ProjectDateFormat = 'DD/MM/YYYY';

const DEFAULT_FORMAT = DEFAULT_DATE_FORMAT;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function applyTokens(d: Date, fmt: string): string {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  return fmt
    .replace(/YYYY/g, yyyy)
    .replace(/MM/g, mm)
    .replace(/DD/g, dd);
}

/** Formata uma DATA PURA (sem tz). Usa `getDate`/`getMonth` locais — assume
 *  que a entrada já foi normalizada para o "dia X" pretendido. */
export function formatDate(input: string | Date | null | undefined, fmt: string = DEFAULT_FORMAT): string {
  if (input == null) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  return applyTokens(d, fmt);
}

/** Formata um MOMENTO REAL convertendo para a tz indicada. Usa Intl.DateTimeFormat
 *  nativo — sem dependência externa. Devolve `"DD/MM/YYYY HH:mm"` no tz dado. */
export function formatMoment(input: string | Date | null | undefined, tz: string | null | undefined): string {
  if (input == null) return '—';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: tz ?? undefined,
  };
  // Locale neutro `en-GB` produz `DD/MM/YYYY, HH:mm`; removemos a vírgula.
  return new Intl.DateTimeFormat('en-GB', opts).format(d).replace(',', '');
}

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/** Fallback absoluto via `formatMoment` quando o instante é >30 dias atrás. */
export function relativeTimeInTimezone(input: string, t: TFn, tz: string | null | undefined): string {
  const diff = Date.now() - new Date(input).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('comments.time.just_now');
  if (m < 60) return t('comments.time.mins_ago', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('comments.time.hours_ago', { count: h });
  const d = Math.floor(h / 24);
  if (d < 30) return t('comments.time.days_ago', { count: d });
  return formatMoment(input, tz);
}

/** Browser timezone como fallback quando o user não tem `timezone` definido. */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Converte um `ProjectDateFormat` (ou string compatível) para a sintaxe
 *  FlatPickr (`d/m/Y`, `d-m-Y`, `Y-m-d`, `m/d/Y`). Com `withTime=true` adiciona
 *  `' H:i'` (24h, conforme convenção da app).
 *
 *  Port literal de `frontend/src/lib/dateFormatting.ts:155-169` (legacy).
 *  Manter sincronizado com a doc canónica @docs/claude/date-formatting.md. */
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
