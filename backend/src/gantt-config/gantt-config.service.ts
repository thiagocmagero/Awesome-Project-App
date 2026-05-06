import { Injectable } from '@nestjs/common';
import { GanttConfigScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertGanttConfigDto } from './dto/upsert-gantt-config.dto';

export interface GanttConfigData {
  columns: {
    start_date: boolean;
    end_date: boolean;
    owner: boolean;
    duration: boolean;
    priority: boolean;
  };
  colors?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
}

const HARDCODED_DEFAULTS: GanttConfigData = {
  columns: { start_date: true, end_date: true, owner: true, duration: true, priority: false },
};

function deepMerge(base: GanttConfigData, override: GanttConfigData): GanttConfigData {
  return {
    columns:  { ...base.columns,            ...override.columns },
    colors:   { ...(base.colors   ?? {}),   ...(override.colors   ?? {}) },
    behavior: { ...(base.behavior ?? {}),   ...(override.behavior ?? {}) },
    defaults: { ...(base.defaults ?? {}),   ...(override.defaults ?? {}) },
  };
}

// Selects sem `id`, `userId`, `projectId` numéricos. Resposta API expõe só
// publicId + scope + config + updatedAt. Frontend (GanttSettingsPage,
// useGanttConfig) só consome `.config`.
const GANTT_CONFIG_SELECT = {
  publicId:  true,
  scope:     true,
  config:    true,
  updatedAt: true,
} as const;

@Injectable()
export class GanttConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Getters (raw records) ────────────────────────────────────────────────────

  getGlobal() {
    return this.prisma.ganttConfig.findFirst({
      where: { scope: GanttConfigScope.GLOBAL, userId: null, projectId: null },
      select: GANTT_CONFIG_SELECT,
    });
  }

  getForUser(userId: number) {
    return this.prisma.ganttConfig.findFirst({
      where: { scope: GanttConfigScope.USER, userId, projectId: null },
      select: GANTT_CONFIG_SELECT,
    });
  }

  async getForProject(userId: number, projectPublicId: string) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    return this.prisma.ganttConfig.findFirst({
      where: { scope: GanttConfigScope.PROJECT, userId, projectId: project.id },
      select: GANTT_CONFIG_SELECT,
    });
  }

  // ── Internal helper para upsert (precisa do `id` numérico) ───────────────────

  private async getInternalId(
    scope: GanttConfigScope,
    userId: number | null,
    projectId: number | null,
  ): Promise<number | null> {
    const rec = await this.prisma.ganttConfig.findFirst({
      where: { scope, userId, projectId },
      select: { id: true },
    });
    return rec?.id ?? null;
  }

  // ── Resolve (merged) ─────────────────────────────────────────────────────────

  async resolve(userId: number, projectPublicId?: string): Promise<GanttConfigData> {
    let merged = { ...HARDCODED_DEFAULTS };

    const globalRec = await this.getGlobal();
    if (globalRec) merged = deepMerge(merged, globalRec.config as unknown as GanttConfigData);

    const userRec = await this.getForUser(userId);
    if (userRec) merged = deepMerge(merged, userRec.config as unknown as GanttConfigData);

    if (projectPublicId) {
      const projectRec = await this.getForProject(userId, projectPublicId);
      if (projectRec) merged = deepMerge(merged, projectRec.config as unknown as GanttConfigData);
    }

    return merged;
  }

  // ── Upserts ──────────────────────────────────────────────────────────────────

  async upsertGlobal(dto: UpsertGanttConfigDto) {
    const existingId = await this.getInternalId(GanttConfigScope.GLOBAL, null, null);
    if (existingId !== null) {
      return this.prisma.ganttConfig.update({
        where: { id: existingId },
        data: { config: dto as object },
        select: GANTT_CONFIG_SELECT,
      });
    }
    return this.prisma.ganttConfig.create({
      data: { scope: GanttConfigScope.GLOBAL, userId: null, projectId: null, config: dto as object },
      select: GANTT_CONFIG_SELECT,
    });
  }

  async upsertUser(userId: number, dto: UpsertGanttConfigDto) {
    const existingId = await this.getInternalId(GanttConfigScope.USER, userId, null);
    if (existingId !== null) {
      return this.prisma.ganttConfig.update({
        where: { id: existingId },
        data: { config: dto as object },
        select: GANTT_CONFIG_SELECT,
      });
    }
    return this.prisma.ganttConfig.create({
      data: { scope: GanttConfigScope.USER, userId, projectId: null, config: dto as object },
      select: GANTT_CONFIG_SELECT,
    });
  }

  async upsertProject(userId: number, projectPublicId: string, dto: UpsertGanttConfigDto) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { publicId: projectPublicId },
      select: { id: true },
    });

    const existingId = await this.getInternalId(GanttConfigScope.PROJECT, userId, project.id);
    if (existingId !== null) {
      return this.prisma.ganttConfig.update({
        where: { id: existingId },
        data: { config: dto as object },
        select: GANTT_CONFIG_SELECT,
      });
    }
    return this.prisma.ganttConfig.create({
      data: { scope: GanttConfigScope.PROJECT, userId, projectId: project.id, config: dto as object },
      select: GANTT_CONFIG_SELECT,
    });
  }
}
