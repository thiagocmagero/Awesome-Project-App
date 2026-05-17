import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, setActiveWorkspaceId } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export type WorkspaceRole = 'OWNER' | 'BASIC' | 'LICENSED';

export interface Workspace {
  publicId: string;
  name: string;
  status: string;
  createdAt: string;
  role: WorkspaceRole;
}

interface WorkspacesContextValue {
  workspaces: Workspace[];
  loading: boolean;
  /** Workspace activo derivado do URL (`:workspaceId`) ou fallback para o primeiro da lista. */
  activeWorkspace: Workspace | null;
  refresh: () => Promise<void>;
  create: (name: string) => Promise<Workspace>;
}

const WorkspacesContext = createContext<WorkspacesContextValue | null>(null);

const ROLE_KEYS: Record<WorkspaceRole, string> = {
  OWNER: 'workspaces.role.owner',
  BASIC: 'workspaces.role.basic',
  LICENSED: 'workspaces.role.licensed',
};

/** Hook React: devolve uma fn que traduz uma `WorkspaceRole` para o idioma activo. */
export function useWorkspaceRoleLabel(): (role: WorkspaceRole) => string {
  const { t } = useTranslation('common');
  return useCallback(
    (role: WorkspaceRole) => (ROLE_KEYS[role] ? t(ROLE_KEYS[role]) : role),
    [t],
  );
}

export function WorkspacesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { workspaceId: paramWsId } = useParams<{ workspaceId?: string }>();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<{ items: Workspace[] }>('/workspaces');
      setWorkspaces(data.items);
    } catch {
      // Mantém lista actual em caso de network error.
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Boot — buscar lista quando o auth termina (e re-buscar quando user muda).
  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const create = useCallback(async (name: string): Promise<Workspace> => {
    const created = await apiPost<{ publicId: string; name: string; status: string; createdAt: string }>(
      '/workspaces',
      { name },
    );
    const ws: Workspace = { ...created, role: 'OWNER' };
    setWorkspaces((prev) => [...prev, ws]);
    return ws;
  }, []);

  const activeWorkspace = useMemo<Workspace | null>(() => {
    if (workspaces.length === 0) return null;
    if (paramWsId) {
      const found = workspaces.find((w) => w.publicId === paramWsId);
      if (found) return found;
    }
    if (user?.workspacePublicId) {
      const own = workspaces.find((w) => w.publicId === user.workspacePublicId);
      if (own) return own;
    }
    return workspaces[0];
  }, [workspaces, paramWsId, user?.workspacePublicId]);

  // Propaga o workspace activo para o `apiFetch` (header `X-Workspace-Id`).
  // Endpoints como `/holidays` resolvem o workspace via este header.
  useEffect(() => {
    setActiveWorkspaceId(activeWorkspace?.publicId ?? null);
  }, [activeWorkspace?.publicId]);

  return (
    <WorkspacesContext.Provider value={{ workspaces, loading, activeWorkspace, refresh, create }}>
      {children}
    </WorkspacesContext.Provider>
  );
}

export function useWorkspaces(): WorkspacesContextValue {
  const ctx = useContext(WorkspacesContext);
  if (!ctx) throw new Error('useWorkspaces must be used inside <WorkspacesProvider>');
  return ctx;
}
