import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import type { AuditLogFilters, CreateAuditLogInput, PageMeta } from './audit-log.types';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma entrada de audit log. Chamada a partir do interceptor global de
   * forma fire-and-forget. Falhas são logadas mas nunca propagadas — auditing
   * NUNCA pode bloquear o request.
   */
  async create(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: input });
    } catch (err) {
      // Não propaga — interceptor já tem `.catch(() => {})` por defesa em
      // profundidade, mas logamos para o admin saber que algo está mal com o BD.
      this.logger.warn(
        `AuditLog write failed: ${(err as Error).message ?? 'unknown'}`,
      );
    }
  }

  /**
   * Lista paginada com filtros. Devolve `{ data, meta }`.
   * `userPublicId` é resolvido para `id` interno antes de entrar no `where`.
   * `userIdInternal` é o atalho usado pelo `findByClient` (já tem o id).
   */
  async findAll(
    filters: AuditLogFilters,
    page = 1,
    limit = 10,
  ): Promise<{ data: AuditLogResponseDto[]; meta: PageMeta }> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);

    const where = await this.buildWhere(filters);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          user: { select: { publicId: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: items.map((log) => AuditLogResponseDto.from(log)),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  /**
   * Filtra logs de um cliente específico. `clientPublicId` é resolvido para
   * `id` interno; se o utilizador não existir lança 404.
   */
  async findByClient(
    clientPublicId: string,
    filters: AuditLogFilters,
    page = 1,
    limit = 10,
  ): Promise<{ data: AuditLogResponseDto[]; meta: PageMeta }> {
    const user = await this.prisma.user.findUnique({
      where: { publicId: clientPublicId },
      select: { id: true },
    });
    if (!user) {
      throw new AppException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return this.findAll(
      { ...filters, userIdInternal: user.id, userPublicId: undefined },
      page,
      limit,
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async buildWhere(filters: AuditLogFilters): Promise<Prisma.AuditLogWhereInput> {
    let userIdResolved = filters.userIdInternal;
    if (!userIdResolved && filters.userPublicId) {
      const u = await this.prisma.user.findUnique({
        where: { publicId: filters.userPublicId },
        select: { id: true },
      });
      // Sentinel -1 garante 0 resultados se o publicId não existir, sem
      // diferenciar de "filtro sem match" (consistente com a UX do admin).
      userIdResolved = u?.id ?? -1;
    }

    const createdAtRange =
      filters.startDate || filters.endDate
        ? {
            ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
          }
        : undefined;

    return {
      ...(userIdResolved !== undefined ? { userId: userIdResolved } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.url
        ? { url: { contains: filters.url, mode: 'insensitive' as const } }
        : {}),
      ...(filters.ip ? { ip: filters.ip } : {}),
      ...(filters.resourceType ? { resourceType: filters.resourceType } : {}),
      ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
      ...(filters.statusCode !== undefined ? { statusCode: filters.statusCode } : {}),
      ...(createdAtRange ? { createdAt: createdAtRange } : {}),
    };
  }
}
