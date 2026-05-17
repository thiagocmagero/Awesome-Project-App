import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { CreateHolidayDateDto } from './dto/create-holiday-date.dto';
import { UpdateHolidayDateDto } from './dto/update-holiday-date.dto';
import { LimitKey } from '../common/entitlements';

interface HolCtx {
  userId: number;
  isAdmin: boolean;
  /**
   * Workspace activo do request — resolvido no controller via header
   * `X-Workspace-Id` (com fallback para `WorkspacesService.getDefaultForUser`).
   *
   * PLATFORM_ADMIN tem este campo, mas o serviço ignora-o em `findAll`/`findOne`
   * (admin vê tudo). Para mutações continua sempre a guardar `workspaceId` para
   * que a `Holiday` criada por admin fique scoped.
   */
  workspaceId: number;
}

@Injectable()
export class HolidaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async resolveHolidayId(publicId: string): Promise<number> {
    const h = await this.prisma.holiday.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!h) throw new AppException('HOLIDAY_NOT_FOUND', HttpStatus.NOT_FOUND);
    return h.id;
  }

  private async resolveHolidayWithOwnership(
    publicId: string,
  ): Promise<{ id: number; ownerId: number | null; workspaceId: number | null }> {
    const h = await this.prisma.holiday.findUnique({
      where: { publicId },
      select: { id: true, ownerId: true, workspaceId: true },
    });
    if (!h) throw new AppException('HOLIDAY_NOT_FOUND', HttpStatus.NOT_FOUND);
    return h;
  }

  private async resolveDateId(publicId: string): Promise<number> {
    const d = await this.prisma.holidayDate.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!d) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return d.id;
  }

  private assertMutate(
    holiday: { ownerId: number | null; workspaceId: number | null },
    ctx: HolCtx,
  ): void {
    if (ctx.isAdmin) return;
    if (holiday.ownerId !== ctx.userId) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    // Defesa em profundidade: utilizador autenticado em workspace A não pode
    // mutar holiday que pertence ao seu workspace B (mesmo sendo owner).
    if (holiday.workspaceId !== null && holiday.workspaceId !== ctx.workspaceId) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }
  }

  private serializeHoliday(h: any) {
    return {
      publicId: h.publicId,
      name: h.name,
      description: h.description ?? null,
      status: h.status,
      _count: h._count,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    };
  }

  private serializeDate(d: any) {
    return {
      publicId: d.publicId,
      name: d.name,
      date: d.date,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private serializeHolidayDetail(h: any) {
    return {
      ...this.serializeHoliday({ ...h, _count: { dates: h.dates?.length ?? 0 } }),
      dates: (h.dates ?? []).map((d: any) => this.serializeDate(d)),
    };
  }

  // ── Holidays CRUD ─────────────────────────────────────────────────────────────

  async findAll(ctx: HolCtx) {
    // PLATFORM_ADMIN: vê tudo. Não-admin: scope ao workspace activo —
    // `CUSTOM` deste utilizador no workspace, OU holidays `GLOBAL`/`REGIONAL`
    // (platform-level, seed admin) que ficam visíveis a todos.
    const where = ctx.isAdmin
      ? {}
      : {
          OR: [
            { scope: 'CUSTOM' as const, ownerId: ctx.userId, workspaceId: ctx.workspaceId },
            { scope: { in: ['GLOBAL' as const, 'REGIONAL' as const] } },
          ],
        };
    const holidays = await this.prisma.holiday.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: { _count: { select: { dates: true } } },
    });
    return holidays.map((h) => this.serializeHoliday(h));
  }

  async findOne(publicId: string, ctx: HolCtx) {
    const h = await this.prisma.holiday.findUnique({
      where: { publicId },
      include: {
        dates: { orderBy: { date: 'asc' } },
        _count: { select: { dates: true } },
      },
    });
    if (!h) throw new AppException('HOLIDAY_NOT_FOUND', HttpStatus.NOT_FOUND);

    // Verify access — admin vê tudo; non-admin precisa ser owner E estar no
    // workspace, OU ser holiday platform-level (GLOBAL/REGIONAL).
    if (!ctx.isAdmin) {
      const isPlatformLevel = h.scope === 'GLOBAL' || h.scope === 'REGIONAL';
      const isOwnerInWorkspace =
        h.ownerId === ctx.userId && h.workspaceId === ctx.workspaceId;
      if (!isPlatformLevel && !isOwnerInWorkspace) {
        throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
      }
    }

    return this.serializeHolidayDetail(h);
  }

  async create(dto: CreateHolidayDto, ctx: HolCtx) {
    const h = await this.prisma.holiday.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: ctx.userId,
        workspaceId: ctx.workspaceId,
      },
      include: { _count: { select: { dates: true } } },
    });
    await this.usageService.increment(ctx.userId, LimitKey.MAX_HOLIDAYS);
    return this.serializeHoliday(h);
  }

  async update(publicId: string, dto: UpdateHolidayDto, ctx: HolCtx) {
    const h = await this.resolveHolidayWithOwnership(publicId);
    this.assertMutate(h, ctx);

    const data: any = {};
    if ('name' in dto) data.name = dto.name;
    if ('description' in dto) data.description = dto.description;
    if ('status' in dto) data.status = dto.status;

    await this.prisma.holiday.update({ where: { publicId }, data });
    return this.findOne(publicId, ctx);
  }

  async remove(publicId: string, ctx: HolCtx) {
    const h = await this.resolveHolidayWithOwnership(publicId);
    this.assertMutate(h, ctx);

    const usageCount = await this.prisma.projectHoliday.count({
      where: { holidayId: h.id },
    });
    if (usageCount > 0) {
      throw new AppException('HOLIDAY_HAS_PROJECTS', HttpStatus.CONFLICT);
    }

    await this.prisma.holiday.delete({ where: { id: h.id } });

    // Decrement usage for the owner
    if (h.ownerId !== null) {
      await this.usageService.decrement(h.ownerId, LimitKey.MAX_HOLIDAYS);
    }

    return { deleted: publicId };
  }

  // ── Holiday Dates ─────────────────────────────────────────────────────────────

  async addDate(
    holidayPublicId: string,
    dto: CreateHolidayDateDto,
    ctx: HolCtx,
  ) {
    const h = await this.resolveHolidayWithOwnership(holidayPublicId);
    this.assertMutate(h, ctx);

    const raw = new Date(dto.date);
    const normalized = new Date(
      Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()),
    );

    try {
      const d = await this.prisma.holidayDate.create({
        data: { holidayId: h.id, name: dto.name, date: normalized },
      });
      return this.serializeDate(d);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new AppException('DATE_ALREADY_EXISTS', HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async updateDate(
    holidayPublicId: string,
    datePublicId: string,
    dto: UpdateHolidayDateDto,
    ctx: HolCtx,
  ) {
    const h = await this.resolveHolidayWithOwnership(holidayPublicId);
    this.assertMutate(h, ctx);

    const dateId = await this.resolveDateId(datePublicId);

    const existing = await this.prisma.holidayDate.findFirst({
      where: { id: dateId, holidayId: h.id },
    });
    if (!existing) {
      throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const data: any = {};
    if ('name' in dto && dto.name !== undefined) data.name = dto.name;
    if ('status' in dto && dto.status !== undefined) data.status = dto.status;
    if ('date' in dto && dto.date !== undefined) {
      const raw = new Date(dto.date);
      data.date = new Date(Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()));
    }

    try {
      const d = await this.prisma.holidayDate.update({ where: { id: dateId }, data });
      return this.serializeDate(d);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new AppException('DATE_ALREADY_EXISTS', HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async removeDate(
    holidayPublicId: string,
    datePublicId: string,
    ctx: HolCtx,
  ) {
    const h = await this.resolveHolidayWithOwnership(holidayPublicId);
    this.assertMutate(h, ctx);

    const dateId = await this.resolveDateId(datePublicId);

    const existing = await this.prisma.holidayDate.findFirst({
      where: { id: dateId, holidayId: h.id },
    });
    if (!existing) {
      throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    await this.prisma.holidayDate.delete({ where: { id: dateId } });
    return { deleted: datePublicId };
  }

  // ── Used by PlanningService ───────────────────────────────────────────────────

  async getNonWorkingDaysForProject(projectId: number): Promise<string[]> {
    const projectHolidays = await this.prisma.projectHoliday.findMany({
      where: {
        projectId,
        holiday: { status: 'ACTIVE' },
      },
      include: {
        holiday: {
          include: {
            dates: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    const dateSet = new Set<string>();
    for (const ph of projectHolidays) {
      for (const d of ph.holiday.dates) {
        const utcDate = new Date(d.date);
        const yyyy = utcDate.getUTCFullYear();
        const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(utcDate.getUTCDate()).padStart(2, '0');
        dateSet.add(`${yyyy}-${mm}-${dd}`);
      }
    }

    return Array.from(dateSet).sort();
  }
}
