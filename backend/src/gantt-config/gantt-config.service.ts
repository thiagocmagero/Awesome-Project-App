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

@Injectable()
export class GanttConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Getters (raw records) ────────────────────────────────────────────────────

  getGlobal() {
    return this.prisma.ganttConfig.findFirst({
      where: { scope: GanttConfigScope.GLOBAL, userId: null, projectId: null },
    });
  }

  getForUser(userId: number) {
    return this.prisma.ganttConfig.findFirst({
      where: { scope: GanttConfigScope.USER, userId, projectId: null },
    });
  }

  async getForProject(userId: number, projectPublicId: string) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    return this.prisma.ganttConfig.findFirst({
      where: { scope: GanttConfigScope.PROJECT, userId, projectId: project.id },
    });
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
    const existing = await this.getGlobal();
    if (existing) {
      return this.prisma.ganttConfig.update({
        where: { id: existing.id },
        data: { config: dto as object },
      });
    }
    return this.prisma.ganttConfig.create({
      data: { scope: GanttConfigScope.GLOBAL, userId: null, projectId: null, config: dto as object },
    });
  }

  async upsertUser(userId: number, dto: UpsertGanttConfigDto) {
    const existing = await this.getForUser(userId);
    if (existing) {
      return this.prisma.ganttConfig.update({
        where: { id: existing.id },
        data: { config: dto as object },
      });
    }
    return this.prisma.ganttConfig.create({
      data: { scope: GanttConfigScope.USER, userId, projectId: null, config: dto as object },
    });
  }

  async upsertProject(userId: number, projectPublicId: string, dto: UpsertGanttConfigDto) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { publicId: projectPublicId },
      select: { id: true },
    });

    const existing = await this.prisma.ganttConfig.findFirst({
      where: { scope: GanttConfigScope.PROJECT, userId, projectId: project.id },
    });

    if (existing) {
      return this.prisma.ganttConfig.update({
        where: { id: existing.id },
        data: { config: dto as object },
      });
    }
    return this.prisma.ganttConfig.create({
      data: { scope: GanttConfigScope.PROJECT, userId, projectId: project.id, config: dto as object },
    });
  }
}
