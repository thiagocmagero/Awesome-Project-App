import type { AuditLogStatus } from '@prisma/client';

export interface CreateAuditLogInput {
  userId: number | null;
  sessionId: number | null;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  ip: string | null;
  userAgent: string | null;
  action: string | null;
  resourceType: string | null;
  resourceId: string | null;
  status: AuditLogStatus;
  errorMessage: string | null;
}

export interface AuditLogFilters {
  /** PublicId UUID v7 do utilizador — resolvido para `id` Int no service. */
  userPublicId?: string;
  /** Atalho interno usado por `findByClient` (já resolvido a `id`). */
  userIdInternal?: number;
  action?: string;
  status?: AuditLogStatus;
  method?: string;
  /** Contains case-insensitive. */
  url?: string;
  ip?: string;
  resourceType?: string;
  resourceId?: string;
  statusCode?: number;
  /** ISO 8601 — `gte`. */
  startDate?: string;
  /** ISO 8601 — `lte`. */
  endDate?: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
