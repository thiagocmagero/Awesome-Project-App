// Hook 3-níveis para `BoardConfigData` — espelha `useGanttConfig` /
// `useCalendarConfig`. Resolve GLOBAL → USER → PROJECT no backend e expõe
// updates por scope.
//
// Endpoints (ver backend/src/board-config/board-config.controller.ts):
//   GET  /board-config/resolve            (sem projecto: GLOBAL+USER)
//   GET  /board-config/resolve/:projectId (PROJECT_VIEW: GLOBAL+USER+PROJECT)
//   GET/PUT /board-config/global          (PLATFORM_ADMIN)
//   GET/PUT /board-config/user            (qualquer JWT)
//   GET     /board-config/project/:id     (PROJECT_VIEW)
//   PUT     /board-config/project/:id     (BOARD_CONFIG)

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiBase, apiFetch } from '../../lib/api';
import { DEFAULT_BOARD_CONFIG, type BoardConfigData } from './types';

export function useBoardConfig(projectPublicId?: string): {
  config: BoardConfigData;
  loading: boolean;
  setConfig: (c: BoardConfigData) => void;
  updateUserConfig: (c: BoardConfigData) => Promise<boolean>;
  updateProjectConfig: (c: BoardConfigData) => Promise<boolean>;
  updateGlobalConfig: (c: BoardConfigData) => Promise<boolean>;
} {
  const { token } = useAuth();
  const [config, setConfig] = useState<BoardConfigData>(DEFAULT_BOARD_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const api = getApiBase();
    const url = projectPublicId
      ? `${api}/board-config/resolve/${encodeURIComponent(projectPublicId)}`
      : `${api}/board-config/resolve`;

    setLoading(true);
    apiFetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setConfig(data as BoardConfigData);
      })
      .catch((err) => console.error('[useBoardConfig] load error:', err))
      .finally(() => setLoading(false));
  }, [token, projectPublicId]);

  const putConfig = useCallback(
    async (path: string, payload: BoardConfigData): Promise<boolean> => {
      if (!token) return false;
      const api = getApiBase();
      try {
        const r = await apiFetch(`${api}${path}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          console.error('[useBoardConfig] save failed:', err);
          return false;
        }
        return true;
      } catch (err) {
        console.error('[useBoardConfig] save error:', err);
        return false;
      }
    },
    [token],
  );

  const updateUserConfig = useCallback(
    async (c: BoardConfigData): Promise<boolean> => {
      setConfig(c);
      return putConfig('/board-config/user', c);
    },
    [putConfig],
  );

  const updateProjectConfig = useCallback(
    async (c: BoardConfigData): Promise<boolean> => {
      if (!projectPublicId) return false;
      setConfig(c);
      return putConfig(`/board-config/project/${encodeURIComponent(projectPublicId)}`, c);
    },
    [putConfig, projectPublicId],
  );

  const updateGlobalConfig = useCallback(
    async (c: BoardConfigData): Promise<boolean> => {
      setConfig(c);
      return putConfig('/board-config/global', c);
    },
    [putConfig],
  );

  return { config, loading, setConfig, updateUserConfig, updateProjectConfig, updateGlobalConfig };
}
