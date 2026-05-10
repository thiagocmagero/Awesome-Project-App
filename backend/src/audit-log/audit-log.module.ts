import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';

/**
 * Módulo de Audit Logs. `@Global` — o `AuditLogService` é exportado para
 * que `AuditLogInterceptor` (registado em `app.module.ts` via APP_INTERCEPTOR)
 * possa injectá-lo.
 *
 * Ver docs/claude/audit-logs.md.
 */
@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogInterceptor],
  exports: [AuditLogService, AuditLogInterceptor],
})
export class AuditLogModule {}
