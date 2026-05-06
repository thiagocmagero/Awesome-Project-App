import { Injectable } from '@nestjs/common';
import { BoardConfigScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertBoardConfigDto } from './dto/upsert-board-config.dto';

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
}

export interface BoardColorsConfig {
  priority?: {
    high?: string;
    medium?: string;
    low?: string;
    none?: string;
  };
}

export interface BoardConfigData {
  visual?: BoardVisualConfig;
  behavior?: BoardBehaviorConfig;
  colors?: BoardColorsConfig;
}

const HARDCODED_DEFAULTS: BoardConfigData = {
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
  },
  colors: {
    priority: {
      high:   '#ef4444',
      medium: '#f59e0b',
      low:    '#3b82f6',
      none:   '#9ca3af',
    },
  },
};

function deepMerge(base: BoardConfigData, override: BoardConfigData): BoardConfigData {
  return {
    visual: {
      ...(base.visual ?? {}),
      ...(override.visual ?? {}),
    },
    behavior: {
      ...(base.behavior ?? {}),
      ...(override.behavior ?? {}),
    },
    colors: {
      ...(base.colors ?? {}),
      ...(override.colors ?? {}),
      priority: {
        ...(base.colors?.priority ?? {}),
        ...(override.colors?.priority ?? {}),
      },
    },
  };
}

// Selects sem `id`/`userId`/`projectId` numéricos. Frontend só consome
// `.config` (ver useBoardConfig.ts).
const BOARD_CONFIG_SELECT = {
  publicId:  true,
  scope:     true,
  config:    true,
  updatedAt: true,
} as const;

@Injectable()
export class BoardConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Getters (sem `id` numérico — só publicId+scope+config) ──────────────────

  getGlobal() {
    return this.prisma.boardConfig.findFirst({
      where: { scope: BoardConfigScope.GLOBAL, userId: null, projectId: null },
      select: BOARD_CONFIG_SELECT,
    });
  }

  getForUser(userId: number) {
    return this.prisma.boardConfig.findFirst({
      where: { scope: BoardConfigScope.USER, userId, projectId: null },
      select: BOARD_CONFIG_SELECT,
    });
  }

  async getForProject(userId: number, projectPublicId: string) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    return this.prisma.boardConfig.findFirst({
      where: { scope: BoardConfigScope.PROJECT, userId, projectId: project.id },
      select: BOARD_CONFIG_SELECT,
    });
  }

  // ── Internal helper para upsert (precisa do `id` interno) ───────────────────

  private async getInternalId(
    scope: BoardConfigScope,
    userId: number | null,
    projectId: number | null,
  ): Promise<number | null> {
    const rec = await this.prisma.boardConfig.findFirst({
      where: { scope, userId, projectId },
      select: { id: true },
    });
    return rec?.id ?? null;
  }

  // ── Resolve (3 níveis) ──────────────────────────────────────────────────────

  async resolve(userId: number, projectPublicId?: string): Promise<BoardConfigData> {
    let merged: BoardConfigData = JSON.parse(JSON.stringify(HARDCODED_DEFAULTS));

    const globalRec = await this.getGlobal();
    if (globalRec) merged = deepMerge(merged, globalRec.config as unknown as BoardConfigData);

    const userRec = await this.getForUser(userId);
    if (userRec) merged = deepMerge(merged, userRec.config as unknown as BoardConfigData);

    if (projectPublicId) {
      const projectRec = await this.getForProject(userId, projectPublicId);
      if (projectRec) merged = deepMerge(merged, projectRec.config as unknown as BoardConfigData);
    }

    return merged;
  }

  // ── Upserts ─────────────────────────────────────────────────────────────────

  async upsertGlobal(dto: UpsertBoardConfigDto) {
    const existingId = await this.getInternalId(BoardConfigScope.GLOBAL, null, null);
    if (existingId !== null) {
      return this.prisma.boardConfig.update({
        where: { id: existingId },
        data: { config: dto as object },
        select: BOARD_CONFIG_SELECT,
      });
    }
    return this.prisma.boardConfig.create({
      data: {
        scope: BoardConfigScope.GLOBAL,
        userId: null,
        projectId: null,
        config: dto as object,
      },
      select: BOARD_CONFIG_SELECT,
    });
  }

  async upsertUser(userId: number, dto: UpsertBoardConfigDto) {
    const existingId = await this.getInternalId(BoardConfigScope.USER, userId, null);
    if (existingId !== null) {
      return this.prisma.boardConfig.update({
        where: { id: existingId },
        data: { config: dto as object },
        select: BOARD_CONFIG_SELECT,
      });
    }
    return this.prisma.boardConfig.create({
      data: {
        scope: BoardConfigScope.USER,
        userId,
        projectId: null,
        config: dto as object,
      },
      select: BOARD_CONFIG_SELECT,
    });
  }

  async upsertProject(userId: number, projectPublicId: string, dto: UpsertBoardConfigDto) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    const existingId = await this.getInternalId(BoardConfigScope.PROJECT, userId, project.id);
    if (existingId !== null) {
      return this.prisma.boardConfig.update({
        where: { id: existingId },
        data: { config: dto as object },
        select: BOARD_CONFIG_SELECT,
      });
    }
    return this.prisma.boardConfig.create({
      data: {
        scope: BoardConfigScope.PROJECT,
        userId,
        projectId: project.id,
        config: dto as object,
      },
      select: BOARD_CONFIG_SELECT,
    });
  }
}
