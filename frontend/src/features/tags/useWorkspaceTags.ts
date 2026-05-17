import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch, getApiBase } from '../../lib/api';
import type { Tag } from './types';

interface UseWorkspaceTagsResult {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Cache em-módulo do conjunto de tags do workspace (default do user). Tags
 * mudam pouco — recarregamos apenas quando um TaskModal grava uma task com
 * `newTagNames` ou explicitamente via `refresh()`.
 */
let cache: Tag[] | null = null;
let inflight: Promise<Tag[]> | null = null;
const subscribers = new Set<(tags: Tag[]) => void>();

function notify(next: Tag[]) {
  cache = next;
  for (const fn of subscribers) fn(next);
}

async function fetchTags(token: string | null): Promise<Tag[]> {
  const res = await apiFetch(`${getApiBase()}/workspaces/me/tags`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to load workspace tags (${res.status})`);
  }
  return (await res.json()) as Tag[];
}

export function useWorkspaceTags(): UseWorkspaceTagsResult {
  const { token, user } = useAuth();
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
        inflight = fetchTags(token).finally(() => {
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
  }, [token, user]);

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
export function invalidateWorkspaceTagsCache(token: string | null): void {
  fetchTags(token)
    .then((next) => notify(next))
    .catch(() => {
      /* silent — próximo render re-tenta via `useEffect` se a cache continua nula */
    });
}

