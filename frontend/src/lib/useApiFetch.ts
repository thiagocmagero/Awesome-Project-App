import { useCallback } from 'react';
import { apiFetch } from './api';
import { useCurrentWorkspaceMaybe } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook que devolve um fetcher pré-bound ao workspace context corrente.
 *
 * V1: o `apiFetch` global lê o `workspacePublicId` directamente do
 * localStorage (`app_user.workspacePublicId`) — funciona porque o user só tem
 * 1 workspace e o AuthContext mantém localStorage sincronizado com a sessão.
 *
 * V2: este hook torna-se obrigatório porque o user pode ter múltiplos
 * workspaces e o `:workspacePublicId` da URL é a única fonte de verdade. O
 * fetcher devolvido por `useApiFetch()` injecta o header explicitamente a
 * partir do `WorkspaceContext` (lendo do React Router param), evitando
 * dependência do localStorage.
 *
 * Uso (V2-ready):
 *   const apiFetch = useApiFetch();
 *   const res = await apiFetch(`${api}/projects`);
 */
export function useApiFetch() {
  const ws = useCurrentWorkspaceMaybe();
  const { user } = useAuth();
  const wsPublicId = ws?.publicId ?? user?.workspacePublicId ?? null;

  return useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Garante que o header da chamada é o do contexto actual (não o que
      // estiver em localStorage — relevante em V2 com múltiplos workspaces).
      const headers = new Headers(init?.headers);
      if (wsPublicId && !headers.has('X-Workspace-Id')) {
        headers.set('X-Workspace-Id', wsPublicId);
      }
      return apiFetch(input, { ...init, headers });
    },
    [wsPublicId],
  );
}
