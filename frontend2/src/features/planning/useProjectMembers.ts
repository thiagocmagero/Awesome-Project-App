// Carrega membros directos do projeto via `GET /api/v1/projects/:id/members`.
// Após a mudança de modelo (Mai 2026), membros são associados directamente ao
// projecto — não via teams.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../lib/api';
import type { IProjectMember } from './types';

interface UseProjectMembersResult {
  members: IProjectMember[];
  /** Indexa por publicId para resolução O(1) (ex.: `Task.owner_id[]`). */
  byPublicId: Map<string, IProjectMember>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface RawMember {
  publicId: string;
  role?: string;
  user?: {
    publicId: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    avatarUpdatedAt?: string | null;
    userType?: { publicId: string; code: string; label: string } | null;
  } | null;
  // shape alternativo (alguns endpoints devolvem flatten):
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  avatarUpdatedAt?: string | null;
  userType?: { publicId: string; code: string; label: string } | null;
}

function normalize(raw: RawMember): IProjectMember | null {
  const u = raw.user ?? null;
  const publicId = u?.publicId ?? raw.publicId;
  const name = u?.name ?? raw.name ?? '';
  const email = u?.email ?? raw.email ?? '';
  if (!publicId || !name) return null;
  return {
    publicId,
    name,
    email,
    avatarUrl: u?.avatarUrl ?? raw.avatarUrl ?? null,
    avatarUpdatedAt: u?.avatarUpdatedAt ?? raw.avatarUpdatedAt ?? null,
    role: (raw.role ?? 'READER') as IProjectMember['role'],
    userType: u?.userType ?? raw.userType ?? null,
  };
}

export function useProjectMembers(projectPublicId: string | undefined): UseProjectMembersResult {
  const [members, setMembers] = useState<IProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectPublicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const raw = await apiGet<RawMember[]>(`/projects/${projectPublicId}/members`);
      const list = Array.isArray(raw)
        ? raw.map(normalize).filter((m): m is IProjectMember => m !== null)
        : [];
      setMembers(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [projectPublicId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const byPublicId = useMemo(() => {
    const m = new Map<string, IProjectMember>();
    members.forEach((member) => m.set(member.publicId, member));
    return m;
  }, [members]);

  return { members, byPublicId, loading, error, refresh };
}
