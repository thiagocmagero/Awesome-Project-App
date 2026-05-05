// Hook: calendar configuration — 3 levels (GLOBAL → USER → PROJECT)
// Mirrors useBoardConfig.ts.
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiBase, apiFetch } from '../../lib/api';
import { CALENDAR_CONFIG_DEFAULTS, type CalendarConfigData } from './types';

function deepMerge(base: CalendarConfigData, override: Partial<CalendarConfigData>): CalendarConfigData {
  return {
    sources: {
      ...(base.sources ?? {}),
      ...(override.sources ?? {}),
      holidays: {
        ...(base.sources?.holidays ?? {}),
        ...(override.sources?.holidays ?? {}),
      },
      eventTypes: {
        ...(base.sources?.eventTypes ?? {}),
        ...(override.sources?.eventTypes ?? {}),
      },
    },
    view:     override.view     ?? base.view,
    firstDay: override.firstDay ?? base.firstDay,
  };
}

export function useCalendarConfig(projectPublicId?: string): {
  config: CalendarConfigData;
  loading: boolean;
  updateProjectConfig: (c: Partial<CalendarConfigData>) => Promise<boolean>;
  updateUserConfig:    (c: Partial<CalendarConfigData>) => Promise<boolean>;
  updateGlobalConfig:  (c: Partial<CalendarConfigData>) => Promise<boolean>;
} {
  const { token } = useAuth();
  const [config, setConfig] = useState<CalendarConfigData>(CALENDAR_CONFIG_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const api = getApiBase();
    const url = projectPublicId
      ? `${api}/calendar-config/resolve/${encodeURIComponent(projectPublicId)}`
      : `${api}/calendar-config/resolve`;

    setLoading(true);
    apiFetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setConfig(data as CalendarConfigData); })
      .catch((err) => console.error('[useCalendarConfig] load error:', err))
      .finally(() => setLoading(false));
  }, [token, projectPublicId]);

  const upsert = useCallback(
    async (
      url: string,
      payload: Partial<CalendarConfigData>,
    ): Promise<boolean> => {
      if (!token) return false;
      setConfig((prev) => deepMerge(prev, payload));
      try {
        const r = await apiFetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          console.error('[useCalendarConfig] save failed:', err);
          return false;
        }
        return true;
      } catch (err) {
        console.error('[useCalendarConfig] save error:', err);
        return false;
      }
    },
    [token],
  );

  const updateProjectConfig = useCallback(
    (c: Partial<CalendarConfigData>) => {
      if (!projectPublicId) return Promise.resolve(false);
      const api = getApiBase();
      return upsert(`${api}/calendar-config/project/${encodeURIComponent(projectPublicId)}`, c);
    },
    [upsert, projectPublicId],
  );

  const updateUserConfig = useCallback(
    (c: Partial<CalendarConfigData>) => {
      const api = getApiBase();
      return upsert(`${api}/calendar-config/user`, c);
    },
    [upsert],
  );

  const updateGlobalConfig = useCallback(
    (c: Partial<CalendarConfigData>) => {
      const api = getApiBase();
      return upsert(`${api}/calendar-config/global`, c);
    },
    [upsert],
  );

  return { config, loading, updateProjectConfig, updateUserConfig, updateGlobalConfig };
}
