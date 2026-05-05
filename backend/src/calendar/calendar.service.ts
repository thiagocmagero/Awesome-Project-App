import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CalendarEventTypeKey,
  HolidayScope,
  InviteStatus,
  Status,
} from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';
import { ReorderEventTypesDto } from './dto/reorder-event-types.dto';

/** Tipos sistema criados automaticamente no primeiro GET /calendar (idempotente). */
const SYSTEM_EVENT_TYPES: Array<{
  systemKey: CalendarEventTypeKey;
  color: string;
  position: number;
}> = [
  { systemKey: CalendarEventTypeKey.MANUAL,   color: '#845adf', position: 0 },
  { systemKey: CalendarEventTypeKey.MEETING,  color: '#23b7e5', position: 1 },
  { systemKey: CalendarEventTypeKey.REMINDER, color: '#f5b849', position: 2 },
];

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async resolveProjectId(projectPublicId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
    return project.id;
  }

  private async resolveTypeId(typePublicId: string, projectId: number): Promise<number> {
    const t = await this.prisma.calendarEventType.findFirst({
      where: { publicId: typePublicId, projectId, status: Status.ACTIVE },
      select: { id: true },
    });
    if (!t) throw new AppException('CALENDAR_EVENT_TYPE_NOT_FOUND', HttpStatus.NOT_FOUND);
    return t.id;
  }

  private async resolveEventId(eventPublicId: string, projectId: number): Promise<number> {
    const ev = await this.prisma.calendarEvent.findFirst({
      where: { publicId: eventPublicId, projectId, status: Status.ACTIVE },
      select: { id: true },
    });
    if (!ev) throw new AppException('CALENDAR_EVENT_NOT_FOUND', HttpStatus.NOT_FOUND);
    return ev.id;
  }

  /** Garante que os 3 tipos sistema existem (idempotente). */
  private async ensureSystemTypes(projectId: number): Promise<void> {
    const existing = await this.prisma.calendarEventType.count({
      where: { projectId, isSystem: true, status: Status.ACTIVE },
    });
    if (existing >= SYSTEM_EVENT_TYPES.length) return;

    for (const t of SYSTEM_EVENT_TYPES) {
      const present = await this.prisma.calendarEventType.findFirst({
        where: { projectId, systemKey: t.systemKey },
      });
      if (!present) {
        await this.prisma.calendarEventType.create({
          data: {
            projectId,
            systemKey: t.systemKey,
            isSystem: true,
            name: null,
            color: t.color,
            position: t.position,
            status: Status.ACTIVE,
          },
        });
      }
    }
  }

  // ── GET /calendar ───────────────────────────────────────────────────────────

  /**
   * Payload agregado: eventos + tipos + tarefas read-only + lista de holidays
   * (linkados ao projecto + owned pelo utilizador, dedupados) + project basics.
   * O frontend filtra/oculta por toggle individual no sources panel.
   */
  async getCalendar(projectPublicId: string, userId: number) {
    const projectId = await this.resolveProjectId(projectPublicId);

    await this.ensureSystemTypes(projectId);

    const [eventTypes, events, tasks, project, projectHolidays, userHolidays] =
      await Promise.all([
        this.prisma.calendarEventType.findMany({
          where: { projectId, status: Status.ACTIVE },
          orderBy: { position: 'asc' },
          select: {
            publicId: true,
            systemKey: true,
            isSystem: true,
            name: true,
            color: true,
            position: true,
          },
        }),
        this.prisma.calendarEvent.findMany({
          where: { projectId, status: Status.ACTIVE },
          orderBy: { startAt: 'asc' },
          select: {
            publicId: true,
            title: true,
            description: true,
            startAt: true,
            endAt: true,
            allDay: true,
            color: true,
            type: { select: { publicId: true } },
            createdBy: { select: { publicId: true, name: true } },
          },
        }),
        this.prisma.ganttTask.findMany({
          where: { projectId, type: { in: ['task', 'milestone'] } },
          select: {
            publicId: true,
            text: true,
            type: true,
            startDate: true,
            endDate: true,
            duration: true,
          },
        }),
        this.prisma.project.findUnique({
          where: { id: projectId },
          select: { publicId: true, name: true, startDate: true, endDate: true },
        }),
        this.prisma.projectHoliday.findMany({
          where: { projectId },
          select: {
            holiday: {
              select: {
                publicId: true,
                name: true,
                scope: true,
                dates: {
                  where: { status: Status.ACTIVE },
                  select: { publicId: true, name: true, date: true },
                },
              },
            },
          },
        }),
        // Holidays owned pelo utilizador autenticado — vêm do /holidays page
        this.prisma.holiday.findMany({
          where: {
            status: Status.ACTIVE,
            ownerId: userId,
          },
          select: {
            publicId: true,
            name: true,
            scope: true,
            dates: {
              where: { status: Status.ACTIVE },
              select: { publicId: true, name: true, date: true },
            },
          },
        }),
      ]);

    // Lista única de holidays = (linkados ao projecto) ∪ (owned pelo utilizador), dedupados por publicId.
    type HolidayItem = {
      publicId: string;
      name: string;
      scope: HolidayScope;
      isOwned: boolean;
      isProjectLinked: boolean;
      dates: { publicId: string; name: string; date: string }[];
    };
    const map = new Map<string, HolidayItem>();

    const buildDates = (
      h: { dates: { publicId: string; name: string; date: Date }[] },
    ) =>
      h.dates.map((d) => ({
        publicId: d.publicId,
        name: d.name,
        date: d.date.toISOString(),
      }));

    // 1) Holidays linkados ao projecto via ProjectHoliday (qualquer ownerId/scope)
    for (const ph of projectHolidays) {
      const h = ph.holiday;
      if (!h) continue;
      map.set(h.publicId, {
        publicId: h.publicId,
        name: h.name,
        scope: h.scope,
        isOwned: false, // marcado a true no passo 2 se também for owned
        isProjectLinked: true,
        dates: buildDates(h),
      });
    }

    // 2) Holidays owned pelo utilizador — adiciona ou marca isOwned se já estava
    for (const h of userHolidays) {
      const existing = map.get(h.publicId);
      if (existing) {
        existing.isOwned = true;
        continue;
      }
      map.set(h.publicId, {
        publicId: h.publicId,
        name: h.name,
        scope: h.scope,
        isOwned: true,
        isProjectLinked: false,
        dates: buildDates(h),
      });
    }

    const holidays = [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return {
      eventTypes: eventTypes.map((t) => ({
        publicId: t.publicId,
        systemKey: t.systemKey,
        isSystem: t.isSystem,
        name: t.name,
        color: t.color,
        position: t.position,
        // labelKey para o frontend traduzir tipos sistema sem name custom
        labelKey: t.systemKey ? `event_type.system.${t.systemKey.toLowerCase()}` : null,
      })),
      events: events.map((ev) => ({
        publicId: ev.publicId,
        title: ev.title,
        description: ev.description,
        startAt: ev.startAt.toISOString(),
        endAt: ev.endAt.toISOString(),
        allDay: ev.allDay,
        color: ev.color,
        typePublicId: ev.type.publicId,
        createdBy: ev.createdBy
          ? { publicId: ev.createdBy.publicId, name: ev.createdBy.name }
          : null,
      })),
      tasks: tasks.map((t) => ({
        publicId: t.publicId,
        text: t.text,
        type: t.type,
        startDate: t.startDate?.toISOString() ?? null,
        endDate:
          t.endDate?.toISOString() ??
          (t.startDate
            ? new Date(t.startDate.getTime() + (t.duration ?? 0) * 86400000).toISOString()
            : null),
        isMilestone: t.type === 'milestone' || (t.duration ?? 0) === 0,
      })),
      project: project
        ? {
            publicId: project.publicId,
            name: project.name,
            startDate: project.startDate?.toISOString() ?? null,
            endDate: project.endDate?.toISOString() ?? null,
          }
        : null,
      holidays,
    };
  }

  /** Lista membros do projecto — usado pelo modal para o campo "criado por" */
  async getMembers(projectPublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        owner: { select: { publicId: true, name: true } },
        members: {
          where: { status: InviteStatus.ACCEPTED },
          select: { user: { select: { publicId: true, name: true } } },
        },
        teams: {
          include: {
            team: {
              select: {
                members: { select: { user: { select: { publicId: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!project) return [];
    const seen = new Set<string>();
    const out: Array<{ id: string; label: string }> = [];
    const add = (u: { publicId: string; name: string } | null) => {
      if (!u || seen.has(u.publicId)) return;
      seen.add(u.publicId);
      out.push({ id: u.publicId, label: u.name });
    };
    if (project.owner) add(project.owner);
    for (const m of project.members) add(m.user);
    for (const pt of project.teams) for (const tm of pt.team.members) add(tm.user);
    return out;
  }

  // ── Event types CRUD ────────────────────────────────────────────────────────

  async listEventTypes(projectPublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);
    await this.ensureSystemTypes(projectId);
    const rows = await this.prisma.calendarEventType.findMany({
      where: { projectId, status: Status.ACTIVE },
      orderBy: { position: 'asc' },
      select: {
        publicId: true,
        systemKey: true,
        isSystem: true,
        name: true,
        color: true,
        position: true,
      },
    });
    return rows.map((t) => ({
      ...t,
      labelKey: t.systemKey ? `event_type.system.${t.systemKey.toLowerCase()}` : null,
    }));
  }

  async createEventType(projectPublicId: string, dto: CreateEventTypeDto) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const maxPos = await this.prisma.calendarEventType.aggregate({
      where: { projectId, status: Status.ACTIVE },
      _max: { position: true },
    });
    return this.prisma.calendarEventType.create({
      data: {
        projectId,
        systemKey: null,
        isSystem: false,
        name: dto.name,
        color: dto.color ?? '#845adf',
        position: (maxPos._max.position ?? -1) + 1,
        status: Status.ACTIVE,
      },
      select: {
        publicId: true,
        systemKey: true,
        isSystem: true,
        name: true,
        color: true,
        position: true,
      },
    });
  }

  async updateEventType(
    projectPublicId: string,
    typePublicId: string,
    dto: UpdateEventTypeDto,
  ) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const t = await this.prisma.calendarEventType.findFirst({
      where: { publicId: typePublicId, projectId, status: Status.ACTIVE },
    });
    if (!t) throw new AppException('CALENDAR_EVENT_TYPE_NOT_FOUND', HttpStatus.NOT_FOUND);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      // Tipos sistema podem ter name=null (volta ao i18n default)
      if (t.isSystem) {
        data.name = dto.name && dto.name.trim() !== '' ? dto.name.trim() : null;
      } else {
        const trimmed = (dto.name ?? '').trim();
        if (trimmed.length === 0) {
          throw new AppException(
            'CALENDAR_EVENT_TYPE_NAME_REQUIRED',
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
        data.name = trimmed;
      }
    }
    if (dto.color !== undefined) data.color = dto.color;

    return this.prisma.calendarEventType.update({
      where: { id: t.id },
      data,
      select: {
        publicId: true,
        systemKey: true,
        isSystem: true,
        name: true,
        color: true,
        position: true,
      },
    });
  }

  async reorderEventTypes(projectPublicId: string, dto: ReorderEventTypesDto) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const types = await this.prisma.calendarEventType.findMany({
      where: { projectId, publicId: { in: dto.orderedPublicIds }, status: Status.ACTIVE },
      select: { id: true, publicId: true },
    });
    if (types.length !== dto.orderedPublicIds.length) {
      throw new AppException('CALENDAR_EVENT_TYPES_INVALID_IDS', HttpStatus.UNPROCESSABLE_ENTITY);
    }
    await this.prisma.$transaction(
      dto.orderedPublicIds.map((pubId, i) => {
        const t = types.find((tp) => tp.publicId === pubId)!;
        return this.prisma.calendarEventType.update({
          where: { id: t.id },
          data: { position: i },
        });
      }),
    );
    return { reordered: dto.orderedPublicIds.length };
  }

  async deleteEventType(projectPublicId: string, typePublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const t = await this.prisma.calendarEventType.findFirst({
      where: { publicId: typePublicId, projectId, status: Status.ACTIVE },
    });
    if (!t) throw new AppException('CALENDAR_EVENT_TYPE_NOT_FOUND', HttpStatus.NOT_FOUND);
    if (t.isSystem) {
      throw new AppException('CALENDAR_EVENT_TYPE_IS_SYSTEM', HttpStatus.CONFLICT);
    }
    const linkedCount = await this.prisma.calendarEvent.count({
      where: { typeId: t.id, status: Status.ACTIVE },
    });
    if (linkedCount > 0) {
      throw new AppException('CALENDAR_EVENT_TYPE_HAS_EVENTS', HttpStatus.CONFLICT);
    }
    await this.prisma.calendarEventType.update({
      where: { id: t.id },
      data: { status: Status.INACTIVE },
    });
    return { deleted: true };
  }

  // ── Events CRUD ─────────────────────────────────────────────────────────────

  async createEvent(projectPublicId: string, userId: number, dto: CreateEventDto) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const typeId = await this.resolveTypeId(dto.typeId, projectId);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt < startAt) {
      throw new AppException('CALENDAR_EVENT_INVALID_RANGE', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const ev = await this.prisma.calendarEvent.create({
      data: {
        projectId,
        typeId,
        title: dto.title,
        description: dto.description ?? null,
        startAt,
        endAt,
        allDay: dto.allDay ?? false,
        color: dto.color ?? null,
        createdById: userId,
        status: Status.ACTIVE,
      },
      select: {
        publicId: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        allDay: true,
        color: true,
        type: { select: { publicId: true } },
        createdBy: { select: { publicId: true, name: true } },
      },
    });
    return this.serializeEvent(ev);
  }

  async updateEvent(projectPublicId: string, eventPublicId: string, dto: UpdateEventDto) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const eventId = await this.resolveEventId(eventPublicId, projectId);

    const data: Record<string, unknown> = {};
    if (dto.typeId !== undefined) {
      data.typeId = await this.resolveTypeId(dto.typeId, projectId);
    }
    if (dto.title !== undefined) data.title = dto.title;
    if ('description' in dto) data.description = dto.description ?? null;
    if (dto.startAt !== undefined) data.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) data.endAt = new Date(dto.endAt);
    if (dto.allDay !== undefined) data.allDay = dto.allDay;
    if ('color' in dto) data.color = dto.color ?? null;

    if (data.startAt && data.endAt && (data.endAt as Date) < (data.startAt as Date)) {
      throw new AppException('CALENDAR_EVENT_INVALID_RANGE', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const ev = await this.prisma.calendarEvent.update({
      where: { id: eventId },
      data,
      select: {
        publicId: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        allDay: true,
        color: true,
        type: { select: { publicId: true } },
        createdBy: { select: { publicId: true, name: true } },
      },
    });
    return this.serializeEvent(ev);
  }

  async deleteEvent(projectPublicId: string, eventPublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const eventId = await this.resolveEventId(eventPublicId, projectId);
    await this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: { status: Status.INACTIVE },
    });
    return { deleted: true };
  }

  // ── Internal serializer ─────────────────────────────────────────────────────

  private serializeEvent(ev: {
    publicId: string;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    color: string | null;
    type: { publicId: string };
    createdBy: { publicId: string; name: string } | null;
  }) {
    return {
      publicId: ev.publicId,
      title: ev.title,
      description: ev.description,
      startAt: ev.startAt.toISOString(),
      endAt: ev.endAt.toISOString(),
      allDay: ev.allDay,
      color: ev.color,
      typePublicId: ev.type.publicId,
      createdBy: ev.createdBy
        ? { publicId: ev.createdBy.publicId, name: ev.createdBy.name }
        : null,
    };
  }
}
