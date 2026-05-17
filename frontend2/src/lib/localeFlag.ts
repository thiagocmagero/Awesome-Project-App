/**
 * Resolve a circle-flags SVG URL for an active locale.
 *
 * The backend (`GET /api/v1/i18n/locales/active`) returns a `flag` field like
 * `pt.png`, `br.png`, `us.png`, `es.png` — we strip the extension and pull the
 * SVG from `hatscripts.github.io/circle-flags`, matching the NewTemplate look.
 *
 * Fallback (locale without `flag`): use the region segment of the code, or
 * the language segment if the code has no region.
 */
export interface ActiveLocale {
  code: string;
  name: string;
  flag: string | null;
}

export function localeFlagBase(locale: ActiveLocale): string {
  if (locale.flag) return locale.flag.replace(/\.[^.]+$/, '');
  const parts = locale.code.split('-');
  return (parts[1] ?? parts[0] ?? 'globe').toLowerCase();
}

export function localeFlagUrl(locale: ActiveLocale): string {
  return `https://hatscripts.github.io/circle-flags/flags/${localeFlagBase(locale)}.svg`;
}
