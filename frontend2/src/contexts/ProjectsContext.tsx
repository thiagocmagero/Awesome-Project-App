import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Project {
  publicId: string;
  name: string;
  status: ProjectStatus;
  /** Workspace ao qual o projecto pertence — usado para filtrar a lista por workspace activo. */
  workspacePublicId: string | null;
  /** Cor opcional do projecto (Project.color quando existir; null por agora). */
  color: string | null;
}

/** Shape parcial devolvida pelo backend (`GET /api/v1/projects`). Há mais campos
 *  no payload mas só estes interessam ao contexto / sidebar. */
interface ApiProject {
  publicId: string;
  name: string;
  status: ProjectStatus;
  workspace?: { publicId: string } | null;
  color?: string | null;
}

interface ProjectsContextValue {
  projects: Project[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiGet<ApiProject[]>('/projects');
      setProjects(
        (data ?? []).map((p) => ({
          publicId: p.publicId,
          name: p.name,
          status: p.status,
          workspacePublicId: p.workspace?.publicId ?? null,
          color: p.color ?? null,
        })),
      );
    } catch {
      // Network/permission failure → manter lista actual (offline-tolerant).
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const value = useMemo<ProjectsContextValue>(() => ({ projects, loading, refresh }), [projects, loading, refresh]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used inside <ProjectsProvider>');
  return ctx;
}

/** Hook conveniente — devolve só os projectos do workspace dado (ACTIVE).
 *  `workspacePublicId === null` → devolve lista vazia (sem workspace activo). */
export function useWorkspaceProjects(workspacePublicId: string | null): Project[] {
  const { projects } = useProjects();
  return useMemo(() => {
    if (!workspacePublicId) return [];
    return projects.filter(
      (p) => p.workspacePublicId === workspacePublicId && p.status === 'ACTIVE',
    );
  }, [projects, workspacePublicId]);
}
