import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

export const AUDIT_KEY = 'audit';

/**
 * Metadados aplicados a um endpoint via `@Audit(...)` para enriquecer o
 * registo automático do `AuditLogInterceptor` com semântica de domínio.
 *
 * `resourceId` pode ser:
 *  - string fixa (raro — geralmente é dinâmico)
 *  - função `(req) => string | null` que extrai do request (ex.: `req.params.id`)
 *
 * Falhas no resolver são silenciosas — o log é criado sem `resourceId`.
 *
 * Ver docs/claude/audit-logs.md.
 */
export interface AuditMetadata {
  action: string;
  resourceType?: string;
  /**
   * Resolver pode devolver `string | string[] | null | undefined`. O
   * interceptor coage para string segura (descarta arrays e usa o primeiro
   * elemento se aplicável). Express tipa `req.params[k]` como
   * `string | string[]` para acomodar wildcard params.
   */
  resourceId?: string | ((req: Request) => string | string[] | null | undefined);
}

export const Audit = (meta: AuditMetadata) => SetMetadata(AUDIT_KEY, meta);
