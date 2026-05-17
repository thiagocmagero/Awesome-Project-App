import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export interface WorkspaceUserType {
  publicId: string;
  code: string;
  label: string;
}

interface ApiUserType {
  publicId: string;
  code: string;
  label: string;
  status?: string;
}

let _cache: WorkspaceUserType[] | null = null;
let _pending: Promise<WorkspaceUserType[]> | null = null;

function fetchOnce(): Promise<WorkspaceUserType[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_pending) return _pending;
  _pending = apiGet<ApiUserType[]>('/user-types')
    .then((items) => {
      _cache = (items ?? []).map((t) => ({ publicId: t.publicId, code: t.code, label: t.label }));
      return _cache;
    })
    .catch(() => {
      _cache = [];
      return _cache;
    })
    .finally(() => {
      _pending = null;
    });
  return _pending;
}

/**
 * Lista de UserTypes acessíveis ao utilizador autenticado.
 *
 * Endpoint `GET /api/v1/user-types`: o backend filtra por `ownerId` para
 * utilizadores não-admin (ver `user-types.service.ts`), pelo que devolve os
 * tipos do workspace do owner — exactamente o que o modal de convite precisa.
 *
 * Cache em memória partilhada entre instâncias do hook (1 fetch por sessão).
 */
export function useWorkspaceUserTypes(): {
  types: WorkspaceUserType[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { user, loading: authLoading } = useAuth();
  const [types, setTypes] = useState<WorkspaceUserType[]>(_cache ?? []);
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTypes([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchOnce()
      .then((list) => {
        if (!cancelled) setTypes(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const refresh = useCallback(async () => {
    _cache = null;
    setLoading(true);
    const list = await fetchOnce();
    setTypes(list);
    setLoading(false);
  }, []);

  return { types, loading, refresh };
}
