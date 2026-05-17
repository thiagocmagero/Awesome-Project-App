import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ensureActiveLocales, resolveDefaultLocaleSync } from '../contexts/LocaleContext';
import { localizedPath } from '../lib/locale';

/**
 * Port literal de frontend/src/components/RedirectWithLocale.tsx (regra 4).
 *
 * Catch-all para URLs sem segmento de locale (`/`, `/foo`, `/dashboard` legacy).
 * Redirect 302 (replace) para `/<userLocale>/<resto-preservado>`.
 */
export default function RedirectWithLocale() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureActiveLocales().finally(() => setReady(true));
  }, []);

  if (loading || !ready) return null;

  const target = resolveDefaultLocaleSync(user);
  const fullPath = `${location.pathname}${location.search}${location.hash}`;
  const next = localizedPath(fullPath, target);
  return <Navigate to={next} replace />;
}
