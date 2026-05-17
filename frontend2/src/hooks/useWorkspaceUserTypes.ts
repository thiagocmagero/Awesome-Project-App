import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export type UserTypeStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface WorkspaceUserType {
  publicId: string;
  code: string;
  label: string;
  status: UserTypeStatus;
  isSystem: boolean;
  /** Soma de referências em User+WorkspaceMember+ProjectMember+TaskResource+TaskResourceNode. */
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiUserType {
  publicId: string;
  code: string;
  label: string;
  status: UserTypeStatus;
  isSystem: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreatePayload {
  code: string;
  label: string;
  description?: string;
}

interface UpdatePayload {
  label?: string;
  description?: string;
  status?: UserTypeStatus;
}

/**
 * Lista de UserTypes acessíveis ao utilizador autenticado + CRUD.
 *
 * Endpoint `GET /api/v1/user-types`: o backend filtra por `ownerId` para
 * BASIC_USER (devolve os do workspace), e tudo para PLATFORM_ADMIN.
 *
 * Mutações: `POST /user-types`, `PATCH /user-types/:id`, `DELETE /user-types/:id`
 * (soft delete — backend devolve item com status `INACTIVE`).
 */
export function useWorkspaceUserTypes() {
  const { user, loading: authLoading } = useAuth();
  const [types, setTypes] = useState<WorkspaceUserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setTypes([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const list = await apiGet<ApiUserType[]>('/user-types');
      setTypes(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    refresh();
  }, [authLoading, refresh]);

  const create = useCallback(async (payload: CreatePayload): Promise<WorkspaceUserType> => {
    const created = await apiPost<ApiUserType>('/user-types', payload);
    setTypes((prev) => [...prev, created].sort((a, b) => a.label.localeCompare(b.label)));
    return created;
  }, []);

  const update = useCallback(async (publicId: string, payload: UpdatePayload): Promise<WorkspaceUserType> => {
    const updated = await apiPatch<ApiUserType>(`/user-types/${publicId}`, payload);
    setTypes((prev) => prev.map((t) => (t.publicId === publicId ? updated : t)).sort((a, b) => a.label.localeCompare(b.label)));
    return updated;
  }, []);

  const toggleActive = useCallback(async (t: WorkspaceUserType): Promise<WorkspaceUserType> => {
    const nextStatus: UserTypeStatus = t.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return update(t.publicId, { status: nextStatus });
  }, [update]);

  const remove = useCallback(async (publicId: string): Promise<{ usageCount: number; reassignedTo: string | null }> => {
    // Backend faz HARD delete (com reassignment automático para "Sem Tipo"
    // quando há referências). Removemos sempre da lista local.
    const result = await apiDelete<{ deleted: string; usageCount: number; reassignedTo: string | null }>(
      `/user-types/${publicId}`,
    );
    setTypes((prev) => prev.filter((t) => t.publicId !== publicId));
    return { usageCount: result.usageCount, reassignedTo: result.reassignedTo };
  }, []);

  return { types, loading, error, refresh, create, update, toggleActive, remove };
}
