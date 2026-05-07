import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';

// Cache keyed by token suffix → flag key + projectPublicId → value.
// Using the last 32 chars of the token as a session discriminator:
// - Different users (different tokens) get separate caches → no cross-user bleed
// - New login (new token) automatically invalidates the old cache
// - Phase 5: cache key inclui projectPublicId — resolução context-aware
//   (LICENSED member herda features do plano do owner) tem cache separado por
//   projecto. Se o user está em 2 projectos com owners diferentes, cada um
//   tem o seu cache.
const cache: Record<string, Record<string, boolean>> = {};

function getSessionCache(token: string): Record<string, boolean> {
  const key = token.slice(-32);
  if (!cache[key]) cache[key] = {};
  return cache[key];
}

function buildCacheKey(flagKey: string, projectPublicId?: string | null): string {
  return `${flagKey}::${projectPublicId ?? ''}`;
}

/**
 * Phase 5: aceita `projectPublicId` opcional. Quando presente, e o utilizador
 * é LICENSED no workspace do owner desse projecto, a resolução usa o plano
 * do owner em vez do próprio. Pages globais sem contexto de projecto omitem
 * o segundo argumento — comportamento legado.
 */
export function useFeatureFlag(
  flagKey: string,
  projectPublicId?: string | null,
): { enabled: boolean; loading: boolean } {
  const { token } = useAuth();
  const sessionCache = token ? getSessionCache(token) : {};
  const cacheKey = buildCacheKey(flagKey, projectPublicId);

  const [enabled, setEnabled] = useState(sessionCache[cacheKey] ?? false);
  const [loading, setLoading] = useState(!(cacheKey in sessionCache));

  useEffect(() => {
    if (!token) return;

    // Always re-fetch when the component mounts — ensures flags enabled/disabled
    // mid-session are picked up on the next navigation without a full page reload.
    // The result is stored in the session cache so sibling hook calls don't duplicate the request.
    const api = getApiBase();
    const url = projectPublicId
      ? `${api}/feature-flags/check/${encodeURIComponent(flagKey)}?projectId=${encodeURIComponent(projectPublicId)}`
      : `${api}/feature-flags/check/${encodeURIComponent(flagKey)}`;
    apiFetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          sessionCache[cacheKey] = data.enabled;
          setEnabled(data.enabled);
        }
      })
      .finally(() => setLoading(false));
  }, [token, flagKey, projectPublicId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enabled, loading };
}
