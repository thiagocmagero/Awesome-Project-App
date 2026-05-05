// Tipos partilhados pelo novo Board (vendor: AwesomeKanban — `src/vendor/awesome-kanban/`).
// Mantêm-se separados dos tipos do Planning porque o Board é um concept-mapping
// distinto: domain (`GanttTask`/`BoardColumn`/`BoardSwimlane`) ↔ widget
// (`Card`/`Column`/`Row`).

import type { Card, Column, Row } from 'awesome-kanban';

// ─── Config (espelha BoardConfigData do backend) ────────────────────────────

export type BoardDensity = 'compact' | 'normal' | 'wide';
export type BoardAccentStyle = 'cap' | 'bar' | 'dot' | 'soft';
export type BoardPriorityStyle = 'pill' | 'dot' | 'stripe';

export interface BoardVisualConfig {
  density?: BoardDensity;
  primaryColor?: string;
  columnAccentStyle?: BoardAccentStyle;
  priorityStyle?: BoardPriorityStyle;
}

export interface BoardBehaviorConfig {
  showSubtasks?: boolean;
  showProgress?: boolean;
  showDates?: boolean;
  showAssignees?: boolean;
  showPriority?: boolean;
  showComments?: boolean;
}

export interface BoardColorsConfig {
  priority?: {
    high?: string;
    medium?: string;
    low?: string;
    none?: string;
  };
  systemColumns?: {
    todo?: string;
    inProgress?: string;
    done?: string;
  };
}

export interface BoardConfigData {
  visual?: BoardVisualConfig;
  behavior?: BoardBehaviorConfig;
  colors?: BoardColorsConfig;
}

export const DEFAULT_BOARD_CONFIG: Required<BoardConfigData> = {
  visual: {
    density: 'compact',
    primaryColor: '#7c5cff',
    columnAccentStyle: 'cap',
    priorityStyle: 'pill',
  },
  behavior: {
    showSubtasks: true,
    showProgress: true,
    showDates: true,
    showAssignees: true,
    showPriority: true,
    showComments: true,
  },
  colors: {
    priority: {
      high:   '#ef4444',
      medium: '#f59e0b',
      low:    '#3b82f6',
      none:   '#9ca3af',
    },
    systemColumns: {
      todo:       '#9ca3af',
      inProgress: '#7c5cff',
      done:       '#26bf94',
    },
  },
};

// ─── User shape consumido pelo `cardShape.users.values` ─────────────────────

export interface BoardUserOption {
  id: string;        // publicId
  label: string;
  color?: string;
}

// ─── Bundle do Board que `useBoardData` devolve ─────────────────────────────

export interface BoardBundle {
  columns: Column[];
  rows: Row[];
  cards: Card[];
  users: BoardUserOption[];
  /** publicId do user autenticado (passado a AwesomeKanban como `currentUser`) */
  currentUserId: string;
}
