import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Renderiza um redirect para `/<workspacePublicId>/dashboard` baseado no
 * user autenticado. Usado:
 *   - Na rota raiz `/` para enviar utilizadores logged-in directamente para o
 *     seu workspace default.
 *   - Como fallback para qualquer rota não-resolvida sob `/`.
 *
 * Comportamento:
 *   - Auth a carregar → renderiza nada (evita flash).
 *   - Sem user → redirect para `/login`.
 *   - User sem workspacePublicId (estado raro/inconsistente) → `/login`
 *     (forçar re-auth para repopular).
 *   - Caso normal → redirect para `/<wsPublicId>/dashboard`.
 */
export default function RedirectToDefaultWorkspace() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.workspacePublicId) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.workspacePublicId}/dashboard`} replace />;
}
