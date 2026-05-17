import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

/**
 * Renderiza um redirect para `/<locale>/<workspacePublicId>/dashboard` baseado
 * no user autenticado. Usado:
 *   - Como `index` da rota `/:locale` para enviar utilizadores logged-in
 *     directamente para o seu workspace default.
 *   - Como fallback para qualquer rota não-resolvida.
 *
 * Comportamento:
 *   - Auth a carregar → renderiza nada (evita flash).
 *   - Sem user → redirect para `/<locale>/login`.
 *   - User sem workspacePublicId (estado raro/inconsistente) → `/<locale>/login`
 *     (forçar re-auth para repopular).
 *   - Caso normal → redirect para `/<locale>/<wsPublicId>/dashboard`.
 */
export default function RedirectToDefaultWorkspace() {
  const { user, loading } = useAuth();
  const { urlLocale } = useLocale();

  if (loading) return null;
  if (!user) return <Navigate to={`/${urlLocale}/login`} replace />;
  if (!user.workspacePublicId) return <Navigate to={`/${urlLocale}/login`} replace />;
  return <Navigate to={`/${urlLocale}/${user.workspacePublicId}/dashboard`} replace />;
}
