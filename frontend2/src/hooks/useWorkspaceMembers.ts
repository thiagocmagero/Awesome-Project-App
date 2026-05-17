import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export type AccessLevel = 'BASIC' | 'LICENSED';
export type MemberStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED';

export interface WorkspaceMember {
  publicId: string;
  email: string;
  name: string | null;
  memberType: AccessLevel;
  status: MemberStatus;
  acceptedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { publicId: string; name: string; email: string; avatarKey: string | null } | null;
  userType: { publicId: string; code: string; label: string } | null;
  projectCount?: number;
}

export interface SeatsSummary {
  used: number;
  total: number;
  base?: number;
  extraSeats?: number;
  plan: { publicId: string; code: string; name: string } | null;
}

interface UpdatePayload {
  memberType?: AccessLevel;
  userTypePublicId?: string | null;
}

/** Listagem dos membros do workspace activo + seats + actions de gestão.
 *  O backend resolve "workspace activo" como o do JWT (default = mais antigo
 *  do owner). Hook fornece mutações optimistas + refresh manual. */
export function useWorkspaceMembers() {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [seats, setSeats] = useState<SeatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [list, s] = await Promise.all([
        apiGet<WorkspaceMember[]>('/workspace-members'),
        apiGet<SeatsSummary>('/workspace-members/seats').catch(() => null),
      ]);
      setMembers(list);
      setSeats(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setMembers([]);
      setSeats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
  }, [authLoading, user, refresh]);

  const updateMember = useCallback(
    async (publicId: string, payload: UpdatePayload): Promise<WorkspaceMember> => {
      const updated = await apiPatch<WorkspaceMember>(`/workspace-members/${publicId}`, payload);
      setMembers((prev) => prev.map((m) => (m.publicId === publicId ? updated : m)));
      return updated;
    },
    [],
  );

  const removeMember = useCallback(async (publicId: string): Promise<void> => {
    await apiDelete(`/workspace-members/${publicId}`);
    setMembers((prev) => prev.filter((m) => m.publicId !== publicId));
  }, []);

  const resendInvite = useCallback(async (publicId: string): Promise<WorkspaceMember> => {
    const updated = await apiPost<WorkspaceMember>(`/workspace-members/${publicId}/resend-invite`, {});
    setMembers((prev) => prev.map((m) => (m.publicId === publicId ? updated : m)));
    return updated;
  }, []);

  return { members, seats, loading, error, refresh, updateMember, removeMember, resendInvite };
}
