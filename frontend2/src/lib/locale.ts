/**
 * Helpers puros para gerir o segmento `:locale` do path da app.
 *
 * Convenção: toda a app vive sob `/<locale>/...`. Os locales activos são os de
 * `Locale.isActive=true` no backend (ver `GET /api/v1/i18n/locales/active`).
 * Em V1: `en`, `es`, `pt-BR`, `pt-PT`.
 *
 * Este módulo NÃO faz fetch — recebe a lista activa como input. O ponto único
 * de fetch é o `LocaleContext` (que cacheia em memória).
 *
 * Port literal de frontend/src/lib/locale.ts (regra 4 da migração).
 */

import type { AuthUser } from '../contexts/AuthContext';

/** Locales fallback hardcoded para uso ANTES de o backend responder. */
export const FALLBACK_ACTIVE_LOCALES = ['en', 'es', 'pt-BR', 'pt-PT'] as const;
export const FALLBACK_LOCALE = 'en';

/**
 * Regex BCP 47 simplificado, **case-insensitive na região**.
 *
 * Convenção da app (alinhada com Stripe/Microsoft/Shopify):
 *  - **URL** usa lowercase (`/pt-pt/...`).
 *  - **BD / `<html lang>` / comparações internas / i18next** mantêm a forma
 *    canónica BCP 47 com região em uppercase (`pt-PT`).
 *  - A canonicalização é feita no boundary (LocaleGuard + helpers abaixo).
 */
const BCP47_CI = /^[a-z]{2}(-[a-z]{2})?$/i;

/** Verifica se a string parece um locale BCP 47 válido, ignorando case. */
export function looksLikeLocale(value: string | undefined | null): boolean {
  return !!value && BCP47_CI.test(value);
}

/** Converte um locale canónico (`pt-PT`) para a forma usada no URL (`pt-pt`). */
export function toUrlLocale(canonical: string): string {
  return canonical.toLowerCase();
}

/**
 * Resolve a forma canónica dum locale a partir do URL (lowercase ou misto)
 * contra a lista activa. Devolve `null` se não houver match case-insensitive.
 */
export function findCanonicalLocale(
  urlValue: string | undefined | null,
  active: readonly string[],
): string | null {
  if (!urlValue) return null;
  const lower = urlValue.toLowerCase();
  return active.find((code) => code.toLowerCase() === lower) ?? null;
}

/** `true` se `urlValue` corresponder (ignorando case) a um locale activo. */
export function isActiveLocale(value: string | undefined | null, active: readonly string[]): boolean {
  return findCanonicalLocale(value, active) !== null;
}

/**
 * Normaliza um locale do `navigator.language` (ex.: `pt-BR`, `en-US`, `pt`)
 * para um dos `active`. Match exacto → match de base → FALLBACK_LOCALE.
 */
export function normalizeBrowserLocale(navLang: string | undefined | null, active: readonly string[]): string {
  if (!navLang) return FALLBACK_LOCALE;
  if (active.includes(navLang)) return navLang;
  const base = navLang.split('-')[0]?.toLowerCase();
  if (!base) return FALLBACK_LOCALE;
  const baseMatch = active.find((l) => l.toLowerCase().startsWith(`${base}-`) || l.toLowerCase() === base);
  return baseMatch ?? FALLBACK_LOCALE;
}

/**
 * Resolve o locale default quando o URL não tem segmento válido.
 *
 * Ordem:
 *  1. `User.locale` (se autenticado e válido).
 *  2. `localStorage['i18n_locale']`.
 *  3. Normalização de `navigator.language`.
 *  4. Fallback.
 */
export function resolveDefaultLocale(
  active: readonly string[],
  user?: AuthUser | null,
): string {
  if (user?.locale && active.includes(user.locale)) return user.locale;

  try {
    const stored = localStorage.getItem('i18n_locale');
    const canonical = findCanonicalLocale(stored, active);
    if (canonical) return canonical;
  } catch {
    /* ignore — Safari private mode etc. */
  }

  const nav = typeof navigator !== 'undefined' ? navigator.language : undefined;
  return normalizeBrowserLocale(nav, active);
}

/** Extrai o primeiro segmento do path se for um locale BCP 47. */
export function readLocaleFromPath(pathname: string): string | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  return looksLikeLocale(segment) ? segment! : null;
}

/** Remove o primeiro segmento do path se for um locale BCP 47. */
export function stripLocaleFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (looksLikeLocale(parts[0])) parts.shift();
  return `/${parts.join('/')}`;
}

/**
 * Prefixa o path com o locale **em forma lowercase** (canónica → URL).
 * Aceita locale canónico (`pt-PT`) ou já em lowercase.
 */
export function localizedPath(path: string, locale: string): string {
  const clean = stripLocaleFromPath(path.startsWith('/') ? path : `/${path}`);
  const tail = clean === '/' ? '' : clean;
  return `/${toUrlLocale(locale)}${tail}`;
}

/**
 * Substitui o segmento de locale no `pathname` preservando query e hash.
 * Usado pelo LanguageSelector e pelo effect de sync URL↔BD.
 */
export function replaceLocaleInFullPath(fullPath: string, nextLocale: string): string {
  const [pathname, ...rest] = fullPath.split('?');
  const search = rest.length > 0 ? `?${rest.join('?')}` : '';
  const [pathOnly, hash] = pathname!.split('#');
  const hashPart = hash ? `#${hash}` : '';
  return `${localizedPath(pathOnly!, nextLocale)}${search}${hashPart}`;
}
