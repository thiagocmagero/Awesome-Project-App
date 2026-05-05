import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';

// Cache keyed by token suffix → flag key → value.
// Using the last 32 chars of the token as a session discriminator:
// - Different users (different tokens) get separate caches → no cross-user bleed
// - New login (new token) automatically invalidates the old cache
// - Within the same session, results are reused across component mounts
const cache: Record<string, Record<string, boolean>> = {};

function getSessionCache(token: string): Record<string, boolean> {
  const key = token.slice(-32);
  if (!cache[key]) cache[key] = {};
  return cache[key];
}

export function useFeatureFlag(flagKey: string): { enabled: boolean; loading: boolean } {
  const { token } = useAuth();
  const sessionCache = token ? getSessionCache(token) : {};

  const [enabled, setEnabled] = useState(sessionCache[flagKey] ?? false);
  const [loading, setLoading] = useState(!(flagKey in sessionCache));

  useEffect(() => {
    if (!token) return;

    // Always re-fetch when the component mounts — ensures flags enabled/disabled
    // mid-session are picked up on the next navigation without a full page reload.
    // The result is stored in the session cache so sibling hook calls don't duplicate the request.
    const api = getApiBase();
    apiFetch(`${api}/feature-flags/check/${encodeURIComponent(flagKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          sessionCache[flagKey] = data.enabled;
          setEnabled(data.enabled);
        }
      })
      .finally(() => setLoading(false));
  }, [token, flagKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { enabled, loading };
}
