import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { AuditLogStatus } from '@prisma/client';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

/**
 * Query params para `GET /audit-logs` e `GET /audit-logs/by-client/:clientId`.
 *
 * `userId` aceita UUID v7 publicId (a API nunca expõe `id` interno — regra
 * obrigatória da app). O service resolve para `id` Int. Não usado em
 * `by-client` (cliente já é fixado pelo path param).
 */
export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsEnum(AuditLogStatus)
  status?: AuditLogStatus;

  @IsOptional()
  @IsString()
  @IsEnum(HTTP_METHODS, { message: 'method must be one of GET, POST, PUT, PATCH, DELETE' })
  method?: HttpMethod;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  statusCode?: number;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
