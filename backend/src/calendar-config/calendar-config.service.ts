import { Injectable } from '@nestjs/common';
import { CalendarConfigScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertCalendarConfigDto } from './dto/upsert-calendar-config.dto';

export interface CalendarConfigSources {
  /** Holidays — { holidayPublicId: visible } (default true para qualquer não presente) */
  holidays?: Record<string, boolean>;
  /** Entidades read-only */
  project?: boolean;          // default true (datas do projecto)
  tasks?: boolean;            // default true
  milestones?: boolean;       // default true
  /** Tipos de evento — { typePublicId: visible } (default true para qualquer tipo) */
  eventTypes?: Record<string, boolean>;
}

export interface CalendarConfigData {
  sources?: CalendarConfigSources;
  view?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  firstDay?: 0 | 1;  // 0=Dom, 1=Seg
}

const HARDCODED_DEFAULTS: CalendarConfigData = {
  sources: {
    holidays:   {},
    project:    true,
    tasks:      true,
    milestones: true,
    eventTypes: {},
  },
  view:     'dayGridMonth',
  firstDay: 1,
};

function deepMerge(base: CalendarConfigData, override: CalendarConfigData): CalendarConfigData {
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

@Injectable()
export class CalendarConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Getters (raw records) ───────────────────────────────────────────────────

  getGlobal() {
    return this.prisma.calendarConfig.findFirst({
      where: { scope: CalendarConfigScope.GLOBAL, userId: null, projectId: null },
    });
  }

  getForUser(userId: number) {
    return this.prisma.calendarConfig.findFirst({
      where: { scope: CalendarConfigScope.USER, userId, projectId: null },
    });
  }

  async getForProject(userId: number, projectPublicId: string) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    return this.prisma.calendarConfig.findFirst({
      where: { scope: CalendarConfigScope.PROJECT, userId, projectId: project.id },
    });
  }

  // ── Resolve (3 níveis) ──────────────────────────────────────────────────────

  async resolve(userId: number, projectPublicId?: string): Promise<CalendarConfigData> {
    let merged: CalendarConfigData = JSON.parse(JSON.stringify(HARDCODED_DEFAULTS));

    const globalRec = await this.getGlobal();
    if (globalRec) merged = deepMerge(merged, globalRec.config as unknown as CalendarConfigData);

    const userRec = await this.getForUser(userId);
    if (userRec) merged = deepMerge(merged, userRec.config as unknown as CalendarConfigData);

    if (projectPublicId) {
      const projectRec = await this.getForProject(userId, projectPublicId);
      if (projectRec) merged = deepMerge(merged, projectRec.config as unknown as CalendarConfigData);
    }

    return merged;
  }

  // ── Upserts ─────────────────────────────────────────────────────────────────

  async upsertGlobal(dto: UpsertCalendarConfigDto) {
    const existing = await this.getGlobal();
    if (existing) {
      return this.prisma.calendarConfig.update({
        where: { id: existing.id },
        data: { config: dto as object },
      });
    }
    return this.prisma.calendarConfig.create({
      data: {
        scope: CalendarConfigScope.GLOBAL,
        userId: null,
        projectId: null,
        config: dto as object,
      },
    });
  }

  async upsertUser(userId: number, dto: UpsertCalendarConfigDto) {
    const existing = await this.getForUser(userId);
    if (existing) {
      return this.prisma.calendarConfig.update({
        where: { id: existing.id },
        data: { config: dto as object },
      });
    }
    return this.prisma.calendarConfig.create({
      data: {
        scope: CalendarConfigScope.USER,
        userId,
        projectId: null,
        config: dto as object,
      },
    });
  }

  async upsertProject(userId: number, projectPublicId: string, dto: UpsertCalendarConfigDto) {
    const project = await this.prisma.project.findUniqueOrThrow({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    const existing = await this.prisma.calendarConfig.findFirst({
      where: { scope: CalendarConfigScope.PROJECT, userId, projectId: project.id },
    });
    if (existing) {
      return this.prisma.calendarConfig.update({
        where: { id: existing.id },
        data: { config: dto as object },
      });
    }
    return this.prisma.calendarConfig.create({
      data: {
        scope: CalendarConfigScope.PROJECT,
        userId,
        projectId: project.id,
        config: dto as object,
      },
    });
  }
}
