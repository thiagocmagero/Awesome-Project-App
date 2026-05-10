import type { AuditLog, AuditLogStatus, User } from '@prisma/client';

type AuditLogWithUser = AuditLog & {
  user: Pick<User, 'publicId' | 'name' | 'email'> | null;
};

/**
 * Resposta canónica de uma entrada de audit log. Nunca inclui `id` interno
 * nem `sessionId` Int — apenas `publicId` e dados úteis ao admin.
 */
export class AuditLogResponseDto {
  publicId!: string;
  user!: { publicId: string; name: string; email: string } | null;
  method!: string;
  url!: string;
  statusCode!: number;
  duration!: number;
  ip!: string | null;
  userAgent!: string | null;
  action!: string | null;
  resourceType!: string | null;
  resourceId!: string | null;
  status!: AuditLogStatus;
  errorMessage!: string | null;
  createdAt!: string;

  static from(log: AuditLogWithUser): AuditLogResponseDto {
    return {
      publicId: log.publicId,
      user: log.user
        ? { publicId: log.user.publicId, name: log.user.name, email: log.user.email }
        : null,
      method: log.method,
      url: log.url,
      statusCode: log.statusCode,
      duration: log.duration,
      ip: log.ip,
      userAgent: log.userAgent,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      status: log.status,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
