import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch, getApiBase } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FALLBACK_ACTIVE_LOCALES,
  FALLBACK_LOCALE,
  findCanonicalLocale,
  replaceLocaleInFullPath,
  resolveDefaultLocale,
  toUrlLocale,
} from '../lib/locale';

/** Port literal de frontend/src/contexts/LocaleContext.tsx (regra 4). */

interface ActiveLocale {
  code: string;
  name: string;
  flag: string | null;
}

interface LocaleContextValue {
  /** Locale canónico (ex.: `pt-PT`). Usar em comparações, i18next, `<html lang>`. */
  locale: string;
  /** Locale em forma URL (lowercase, ex.: `pt-pt`). Usar APENAS para construir hrefs. */
  urlLocale: string;
  activeLocales: ActiveLocale[];
  activeCodes: readonly string[];
  /** Muda locale: navigate + i18n.changeLanguage + PATCH /users/me/locale. */
  setLocale: (next: string) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

let cachedLocales: ActiveLocale[] | null = null;
let pendingFetch: Promise<ActiveLocale[]> | null = null;

function fetchActiveLocales(): Promise<ActiveLocale[]> {
  if (cachedLocales) return Promise.resolve(cachedLocales);
  if (pendingFetch) return pendingFetch;
  pendingFetch = fetch('/api/v1/i18n/locales/active')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('locales fetch failed'))))
    .then((data: ActiveLocale[]) => {
      cachedLocales = Array.isArray(data) ? data : [];
      return cachedLocales;
    })
    .catch(() => {
      const fallback: ActiveLocale[] = FALLBACK_ACTIVE_LOCALES.map((code) => ({ code, name: code, flag: null }));
      cachedLocales = fallback;
      return fallback;
    })
    .finally(() => {
      pendingFetch = null;
    });
  return pendingFetch;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ locale?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [activeLocales, setActiveLocales] = useState<ActiveLocale[]>(cachedLocales ?? []);

  useEffect(() => {
    fetchActiveLocales().then(setActiveLocales);
  }, []);

  const activeCodes = useMemo(
    () => (activeLocales.length > 0 ? activeLocales.map((l) => l.code) : FALLBACK_ACTIVE_LOCALES),
    [activeLocales],
  );

  const locale = useMemo(() => {
    return findCanonicalLocale(params.locale, activeCodes) ?? FALLBACK_LOCALE;
  }, [params.locale, activeCodes]);

  const urlLocale = useMemo(() => toUrlLocale(locale), [locale]);

  const setLocale = useCallback(
    (next: string) => {
      const canonical = findCanonicalLocale(next, activeCodes);
      if (!canonical) return;
      const fullPath = `${location.pathname}${location.search}${location.hash}`;
      const nextPath = replaceLocaleInFullPath(fullPath, canonical);
      navigate(nextPath, { replace: true });
      i18n.changeLanguage(canonical).catch(() => {});
      if (!user) return;
      apiFetch(`${getApiBase()}/users/me/locale`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: canonical }),
      })
        .then((r) => {
          if (r.ok) refreshUser().catch(() => {});
        })
        .catch(() => {});
    },
    [activeCodes, location.pathname, location.search, location.hash, navigate, i18n, user, refreshUser],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, urlLocale, activeLocales, activeCodes, setLocale }),
    [locale, urlLocale, activeLocales, activeCodes, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

export function useLocaleMaybe(): LocaleContextValue | null {
  return useContext(LocaleContext);
}

export function ensureActiveLocales(): Promise<ActiveLocale[]> {
  return fetchActiveLocales();
}

export function getCachedActiveCodes(): readonly string[] {
  return cachedLocales ? cachedLocales.map((l) => l.code) : FALLBACK_ACTIVE_LOCALES;
}

export function resolveDefaultLocaleSync(user?: import('./AuthContext').AuthUser | null): string {
  return resolveDefaultLocale(getCachedActiveCodes(), user);
}
