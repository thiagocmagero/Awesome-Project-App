import { useCurrentWorkspaceMaybe } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

/**
 * Devolve uma função que prefixa um path workspace-scoped com
 * `/<locale>/<wsPublicId>`.
 *
 * Exemplo:
 *   const wsLink = useWorkspaceLink();
 *   <Link to={wsLink('/projects')}>...</Link>
 *   // → /<locale>/<wsId>/projects
 *
 * Resolução do `wsPublicId`:
 *   1. Se está dentro de WorkspaceProvider → usa o publicId da rota actual.
 *   2. Senão → fallback para `user.workspacePublicId` do AuthContext (V1: 1:1).
 *   3. Sem ws disponível → retorna `/<locale>/<path>` (sem ws); o
 *      ProtectedRoute eventualmente redirecciona para login.
 *
 * O locale vem do `LocaleContext` (path actual da URL).
 */
export function useWorkspaceLink() {
  const ws = useCurrentWorkspaceMaybe();
  const { user } = useAuth();
  const { urlLocale } = useLocale();
  const wsPublicId = ws?.publicId ?? user?.workspacePublicId ?? null;

  return (path: string): string => {
    const normalised = path.startsWith('/') ? path : `/${path}`;
    const tail = normalised === '/' ? '' : normalised;
    if (!wsPublicId) return `/${urlLocale}${tail}`;
    return `/${urlLocale}/${wsPublicId}${tail}`;
  };
}
