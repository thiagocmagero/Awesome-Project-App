import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPatch } from '../lib/api';

export type ProjectRole = 'OWNER' | 'CONTRIBUTOR' | 'READER';

export interface MemberProjectRow {
  publicId: string;
  name: string;
  assigned: boolean;
  role: ProjectRole | null;
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED' | null;
}

/** Lista de projectos do workspace com flag `assigned`/`role` para o membro
 *  dado (`memberPublicId`). Usado pelo painel "Gerir pessoa" para mostrar
 *  checkboxes + select de role.
 *
 *  `null` em `memberPublicId` ⇒ não carrega nada (modo inicial do panel). */
export function useMemberProjects(memberPublicId: string | null) {
  const [projects, setProjects] = useState<MemberProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!memberPublicId) {
      setProjects([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await apiGet<MemberProjectRow[]>(`/workspace-members/${memberPublicId}/projects`);
      setProjects(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [memberPublicId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (assignments: { projectPublicId: string; role: ProjectRole }[]): Promise<void> => {
      if (!memberPublicId) return;
      await apiPatch(`/workspace-members/${memberPublicId}/projects`, { assignments });
      await refresh();
    },
    [memberPublicId, refresh],
  );

  return { projects, loading, error, refresh, save };
}
