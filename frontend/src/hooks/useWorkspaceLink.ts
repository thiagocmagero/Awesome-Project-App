import { useCurrentWorkspaceMaybe } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Devolve uma função que prefixa um path workspace-scoped com `/<wsPublicId>`.
 *
 * Exemplo:
 *   const wsLink = useWorkspaceLink();
 *   <Link to={wsLink('/projects')}>...</Link>
 *   // → /<wsId>/projects
 *
 * Resolução:
 *   1. Se está dentro de WorkspaceProvider → usa o publicId da rota actual.
 *   2. Senão → fallback para `user.workspacePublicId` do AuthContext (V1: 1:1).
 *   3. Sem ws disponível → retorna o path inalterado (degradation gracioso;
 *      ProtectedRoute eventualmente redirecciona para login).
 */
export function useWorkspaceLink() {
  const ws = useCurrentWorkspaceMaybe();
  const { user } = useAuth();
  const wsPublicId = ws?.publicId ?? user?.workspacePublicId ?? null;

  return (path: string): string => {
    if (!wsPublicId) return path;
    // Path absoluto → prefixar com workspace publicId
    const normalised = path.startsWith('/') ? path : `/${path}`;
    return `/${wsPublicId}${normalised}`;
  };
}
