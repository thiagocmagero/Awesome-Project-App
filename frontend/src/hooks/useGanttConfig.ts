import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';

export type CellPattern =
  | 'none'              // Solid — sem padrão
  | 'diagonal'          // Diagonal Stripes (45°)
  | 'diagonal-reverse'  // Reverse Diagonal (-45°)
  | 'crosshatch'        // Crosshatch (ambas as diagonais)
  | 'horizontal'        // Horizontal Stripes
  | 'vertical'          // Vertical Stripes
  | 'dots';             // Dots

export interface GanttConfigColors {
  taskBar?: string;        // hex — barras de tarefas normais
  taskBarProject?: string; // hex — barras de tarefas tipo projecto/summary
  milestone?: string;      // hex — marcadores de milestone
  links?: string;          // hex — setas de dependência
  todayMarker?: string;    // hex — linha vertical "hoje"
  // células
  weekendColor?: string;        // hex — cor base das células de fim de semana
  weekendPattern?: CellPattern; // padrão das células de fim de semana (default: 'diagonal')
  holidayColor?: string;        // hex — cor base das células de feriado
  holidayPattern?: CellPattern; // padrão das células de feriado (default: 'diagonal')
}

export interface GanttConfigBehavior {
  dragMove?: boolean;          // arrastar tarefa horizontalmente
  dragResize?: boolean;        // redimensionar tarefa
  dragLinks?: boolean;         // criar dependência por drag
  dragProgress?: boolean;      // arrastar barra de progresso
  openTreeInitially?: boolean; // expandir árvore ao carregar
}

export interface GanttConfigDefaults {
  zoomLevel?: number; // 0-4 (índice em ZOOM_LEVELS)
  endDateMode?: 'inclusive' | 'exclusive'; // modo de data de fim (padrão: 'exclusive')
  /**
   * Granularidade visual do widget Gantt.
   * 'day' (default) — escalas mês/dia, duration_unit=day.
   * 'hour' — escalas dia/hora, duration_unit=hour, snap a 15min.
   * Tasks DAY e HOUR co-existem em qualquer modo; o toggle só muda escalas/snap.
   * Ver docs/claude/tools/gantt/interactions.md.
   */
  viewUnit?: 'day' | 'hour';
}

export interface GanttConfigData {
  columns: {
    start_date: boolean;
    end_date: boolean;
    owner: boolean;
    duration: boolean;
    priority: boolean;
  };
  colors?: GanttConfigColors;
  behavior?: GanttConfigBehavior;
  defaults?: GanttConfigDefaults;
}

const HARDCODED_DEFAULTS: GanttConfigData = {
  columns: { start_date: true, end_date: true, owner: true, duration: true, priority: false },
};

export function useGanttConfig(projectPublicId?: string): {
  config: GanttConfigData;
  loading: boolean;
  /**
   * Actualiza **apenas o estado local** (sem PUT). Usar para actualizações
   * optimistas de alta frequência (ex.: color picker) antes de fazer
   * debounce de `updateProjectConfig`.
   */
  setConfig: (c: GanttConfigData) => void;
  updateProjectConfig: (c: GanttConfigData) => Promise<boolean>;
  updateUserConfig: (c: GanttConfigData) => Promise<boolean>;
} {
  const { token } = useAuth();
  const [config, setConfig] = useState<GanttConfigData>(HARDCODED_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const api = getApiBase();
    const url = projectPublicId
      ? `${api}/gantt-config/resolve/${encodeURIComponent(projectPublicId)}`
      : `${api}/gantt-config/resolve`;

    setLoading(true);
    apiFetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setConfig(data as GanttConfigData);
      })
      .catch((err) => console.error('[useGanttConfig] load error:', err))
      .finally(() => setLoading(false));
  }, [token, projectPublicId]);

  const updateProjectConfig = useCallback(
    async (c: GanttConfigData): Promise<boolean> => {
      if (!token || !projectPublicId) return false;
      setConfig(c); // actualização optimista do estado local
      const api = getApiBase();
      try {
        const r = await apiFetch(
          `${api}/gantt-config/project/${encodeURIComponent(projectPublicId)}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(c),
          },
        );
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          console.error('[useGanttConfig] save project config failed:', err);
          return false;
        }
        return true;
      } catch (err) {
        console.error('[useGanttConfig] save project config error:', err);
        return false;
      }
    },
    [token, projectPublicId],
  );

  const updateUserConfig = useCallback(
    async (c: GanttConfigData): Promise<boolean> => {
      if (!token) return false;
      setConfig(c);
      const api = getApiBase();
      try {
        const r = await apiFetch(`${api}/gantt-config/user`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(c),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          console.error('[useGanttConfig] save user config failed:', err);
          return false;
        }
        return true;
      } catch (err) {
        console.error('[useGanttConfig] save user config error:', err);
        return false;
      }
    },
    [token],
  );

  return { config, loading, setConfig, updateProjectConfig, updateUserConfig };
}
