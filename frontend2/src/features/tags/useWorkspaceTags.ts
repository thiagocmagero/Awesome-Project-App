// Port adaptado de `frontend/src/features/tags/useWorkspaceTags.ts` (regra 4).
// Adaptação face ao legacy:
//   - Usa `apiGet` (frontend2 helpers — cookies HttpOnly) em vez de `apiFetch(token)`.
//   - Sem `Authorization: Bearer` manual.
//
// Mantém o pattern de cache em-módulo + subscribers (tags mudam pouco; só
// re-fetch quando uma task grava `newTagNames` ou via `refresh()`).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiGet } from '../../lib/api';
import type { Tag } from './types';

interface UseWorkspaceTagsResult {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

let cache: Tag[] | null = null;
let inflight: Promise<Tag[]> | null = null;
const subscribers = new Set<(tags: Tag[]) => void>();

function notify(next: Tag[]) {
  cache = next;
  for (const fn of subscribers) fn(next);
}

async function fetchTags(): Promise<Tag[]> {
  return await apiGet<Tag[]>('/workspaces/me/tags');
}

export function useWorkspaceTags(): UseWorkspaceTagsResult {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      if (!inflight) {
        inflight = fetchTags().finally(() => {
          inflight = null;
        });
      }
      const next = await inflight;
      if (!mountedRef.current) return;
      notify(next);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : 'unknown');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const sub = (next: Tag[]) => {
      if (mountedRef.current) setTags(next);
    };
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  useEffect(() => {
    if (cache === null) {
      void load();
    }
  }, [load]);

  return { tags, loading, error, refresh: load };
}

/**
 * Invalida o cache e re-fetcha em background. Pode ser chamado fora de
 * componentes React (ex.: `useTaskForm` após gravar uma task que pode ter
 * criado tags inline).
 */
export function invalidateWorkspaceTagsCache(): void {
  fetchTags()
    .then((next) => notify(next))
    .catch(() => {
      /* silent — próximo render re-tenta via `useEffect` se a cache continua nula */
    });
}
