import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface WorkspaceContextValue {
  publicId: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Provider que lê `:workspacePublicId` da URL via React Router e valida-o
 * contra o workspace default do user autenticado (V1: 1:1).
 *
 * - Sem param → renderiza nada (rota mal-formada).
 * - Param ≠ user.workspacePublicId → redirect para o workspace default
 *   (impede acesso a workspaces de outros utilizadores).
 * - Match → expõe `{ publicId }` aos descendentes via `useCurrentWorkspace()`.
 *
 * Em V2 (multi-workspace) o validation passará a verificar o param contra a
 * lista completa de workspaces do user (owner + ACCEPTED member).
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { workspacePublicId } = useParams<{ workspacePublicId: string }>();
  const { user, loading } = useAuth();

  // Aguardar boot do auth para evitar flash de redirect.
  if (loading) return null;
  if (!workspacePublicId) return null;

  // V1: o user só pode aceder ao seu workspace default. Mismatch → redirect.
  if (user?.workspacePublicId && workspacePublicId !== user.workspacePublicId) {
    return <Navigate to={`/${user.workspacePublicId}/dashboard`} replace />;
  }

  // Sincronizar localStorage para que apiFetch global e refresh-after-F5
  // tenham o mesmo workspace publicId disponível imediatamente.
  // (apiFetch lê de app_user.workspacePublicId — que vem do AuthContext.)
  // Aqui só estamos a garantir que o publicId do URL é o canónico.
  return (
    <WorkspaceContext.Provider value={{ publicId: workspacePublicId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/** Hook para componentes dentro do WorkspaceProvider. */
export function useCurrentWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useCurrentWorkspace must be called inside <WorkspaceProvider>');
  }
  return ctx;
}

/** Hook não-throw — devolve null se fora do Provider. Útil em componentes
 *  partilhados entre rotas workspace-scoped e agnostic. */
export function useCurrentWorkspaceMaybe(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
