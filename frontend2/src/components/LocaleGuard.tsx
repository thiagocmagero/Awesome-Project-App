import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LocaleProvider,
  ensureActiveLocales,
  getCachedActiveCodes,
  resolveDefaultLocaleSync,
  useLocaleMaybe,
} from '../contexts/LocaleContext';
import { useAuth } from '../contexts/AuthContext';
import { findCanonicalLocale, replaceLocaleInFullPath, toUrlLocale } from '../lib/locale';

/**
 * Port literal de frontend/src/components/LocaleGuard.tsx (regra 4).
 *
 * Outer: valida `:locale` contra a lista activa. Inválido → redirect para
 * `/<userLocale>/<resto-preservado>`. Válido → monta `<LocaleProvider>` + inner.
 */
export default function LocaleGuard() {
  const { locale: rawLocale } = useParams<{ locale?: string }>();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    ensureActiveLocales();
  }, []);

  const active = getCachedActiveCodes();
  const canonical = findCanonicalLocale(rawLocale, active);

  if (!canonical) {
    const target = resolveDefaultLocaleSync(user);
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    const next = replaceLocaleInFullPath(fullPath, target);
    return <Navigate to={next} replace />;
  }

  if (rawLocale !== toUrlLocale(canonical)) {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    const next = replaceLocaleInFullPath(fullPath, canonical);
    return <Navigate to={next} replace />;
  }

  return (
    <LocaleProvider>
      <LocaleInnerGuard>
        <Outlet />
      </LocaleInnerGuard>
    </LocaleProvider>
  );
}

/** Inner: sincroniza i18next + `<html lang>` com o locale do path. */
function LocaleInnerGuard({ children }: { children: React.ReactNode }) {
  const ctx = useLocaleMaybe();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!ctx) return;
    if (i18n.language !== ctx.locale) {
      i18n.changeLanguage(ctx.locale).catch(() => {});
    }
    document.documentElement.lang = ctx.locale;
  }, [ctx, i18n]);

  return <>{children}</>;
}
