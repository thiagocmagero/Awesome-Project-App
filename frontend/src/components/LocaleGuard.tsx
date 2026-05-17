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
 * Outer guard: valida `:locale` contra a lista activa. Quando inválido, redirect
 * 302 (replace) para `/<userLocale>/<resto-preservado>`. Quando válido, monta
 * o `<LocaleProvider>` e o `<LocaleInnerGuard>` que sincroniza i18next + lang.
 *
 * Sequência ao montar a app pela primeira vez:
 *  1. `params.locale` pode estar undefined num race (caso raro) — `LocaleGuard`
 *     trata como inválido.
 *  2. Pre-fetch dos locales activos é disparado (idempotente, cache em memória).
 *  3. Enquanto o cache não responde, usamos `FALLBACK_ACTIVE_LOCALES`
 *     hardcoded (`en/es/pt-BR/pt-PT`). Isto evita um flash de redirect numa
 *     app sem rede.
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

  // 1) Locale inválido → redirect para o locale default, preservando o path.
  if (!canonical) {
    const target = resolveDefaultLocaleSync(user);
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    const next = replaceLocaleInFullPath(fullPath, target);
    return <Navigate to={next} replace />;
  }

  // 2) Locale válido mas em case não-lowercase (ex.: `pt-PT` ou `PT-PT`) →
  //    canonicaliza o URL para lowercase, sem perder query/hash. Mantém uma
  //    única URL canónica por página (boa prática SEO/cache, alinhado com
  //    Stripe/Microsoft/Shopify).
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

/**
 * Inner: sincroniza i18next + `<html lang>` com o locale do path. Vive dentro
 * do `<LocaleProvider>` para poder ler `useLocale()`.
 */
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
