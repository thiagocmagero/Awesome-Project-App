import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesGuard } from '../auth/guards/profiles.guard';
import { RequireProfiles } from '../auth/decorators/require-profiles.decorator';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import type { AuditLogFilters } from './audit-log.types';

/**
 * Audit Logs — exclusivo PLATFORM_ADMIN.
 *
 * `GET /audit-logs` — todos os logs (página `/audit` no frontend).
 * `GET /audit-logs/by-client/:clientId` — logs filtrados por publicId UUID
 * de um cliente (tab "Audit" no detalhe de cliente em `/clients`).
 *
 * Estes endpoints estão excluídos do `AuditLogInterceptor` para evitar
 * loops (admin a consultar logs gera logs de consulta).
 */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, ProfilesGuard)
@RequireProfiles('PLATFORM_ADMIN')
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.service.findAll(this.toFilters(query), query.page ?? 1, query.limit ?? 10);
  }

  @Get('by-client/:clientId')
  findByClient(
    @Param('clientId', new ParseUUIDPipe()) clientId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.service.findByClient(
      clientId,
      this.toFilters(query),
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  private toFilters(q: AuditLogQueryDto): AuditLogFilters {
    return {
      userPublicId: q.userId,
      action: q.action,
      status: q.status,
      method: q.method,
      url: q.url,
      ip: q.ip,
      resourceType: q.resourceType,
      resourceId: q.resourceId,
      statusCode: q.statusCode,
      startDate: q.startDate,
      endDate: q.endDate,
    };
  }
}
