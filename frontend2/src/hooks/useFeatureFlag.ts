import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useIsPlatformAdmin } from './useIsPlatformAdmin';

interface FeatureFlagState {
  enabled: boolean;
  loading: boolean;
}

/**
 * Verifica se a feature flag está activa para o utilizador autenticado.
 *
 * Regra obrigatória (CLAUDE.md / docs/claude/auth.md):
 * - PLATFORM_ADMIN bypassa o backend e devolve `true` imediatamente — sem
 *   chamada à API.
 * - Para outros utilizadores: `GET /api/v1/feature-flags/check/:key` resolve
 *   override per-user → plano do user → default. O bypass NÃO deve ser
 *   duplicado pelo caller; basta ler `enabled`.
 *
 * Memoizado por sessão dentro do mesmo módulo via `cache`. Não há cache
 * cross-key — cada flag tem o seu próprio fetch.
 */
const cache = new Map<string, boolean>();

export function useFeatureFlag(key: string): FeatureFlagState {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsPlatformAdmin();
  const [state, setState] = useState<FeatureFlagState>(() => {
    if (cache.has(key)) return { enabled: cache.get(key)!, loading: false };
    return { enabled: false, loading: true };
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ enabled: false, loading: false });
      return;
    }
    if (isAdmin) {
      setState({ enabled: true, loading: false });
      return;
    }
    if (cache.has(key)) {
      setState({ enabled: cache.get(key)!, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<{ enabled: boolean }>(`/feature-flags/check/${key}`);
        if (cancelled) return;
        cache.set(key, !!res.enabled);
        setState({ enabled: !!res.enabled, loading: false });
      } catch {
        if (!cancelled) setState({ enabled: false, loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, isAdmin, key]);

  return state;
}
