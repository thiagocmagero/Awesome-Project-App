import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { AuditLogStatus } from '@prisma/client';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AuditLogService } from './audit-log.service';
import { AUDIT_KEY, type AuditMetadata } from './decorators/audit.decorator';

type AuthRequest = Request & {
  user?: JwtPayload & { internalSessionId?: number };
};

const SKIPPED_PREFIXES = ['/api/v1/audit-logs', '/assets/'];
const SKIPPED_PATHS = new Set(['/api/v1/hello', '/api/v1/auth/refresh']);

/**
 * Regista cada chamada HTTP em `AuditLog`. Corre como `APP_INTERCEPTOR`
 * global, depois do `SessionActivityInterceptor` — `req.user` já está
 * populado pelo `JwtAuthGuard` quando estamos em rotas autenticadas.
 *
 * Regras críticas:
 *  - NUNCA bloqueia o request (try/catch silencioso + create fire-and-forget).
 *  - Sanitiza `url` removendo query params com `token`/`password`/`secret`.
 *  - Trunca `userAgent` a 500 chars e `errorMessage` a 1000.
 *  - Skip de paths excluídos (health, anti-loop sobre /audit-logs, refresh ruidoso).
 *
 * Ver docs/claude/audit-logs.md.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Apenas processa requests HTTP — ignora WebSocket/RPC se existirem no futuro.
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const start = Date.now();
    const path = this.extractPath(req);

    if (this.shouldSkip(path)) return next.handle();

    const meta = this.reflector.getAllAndOverride<AuditMetadata | undefined>(
      AUDIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      tap(() => this.write(req, res, start, meta, null)),
      catchError((err: unknown) => {
        this.write(req, res, start, meta, err);
        return throwError(() => err);
      }),
    );
  }

  private write(
    req: AuthRequest,
    res: Response,
    start: number,
    meta: AuditMetadata | undefined,
    err: unknown,
  ): void {
    try {
      const errStatus = this.extractErrorStatus(err);
      const statusCode = errStatus ?? res.statusCode ?? 200;

      const status: AuditLogStatus =
        statusCode === 401 || statusCode === 403
          ? 'FORBIDDEN'
          : statusCode >= 400
          ? 'ERROR'
          : 'SUCCESS';

      const ip = this.extractIp(req);
      const userAgent =
        ((req.headers['user-agent'] as string | undefined) ?? '').slice(0, 500) || null;

      const user = req.user;
      const userId = typeof user?.sub === 'number' ? user.sub : null;
      const sessionId =
        typeof user?.internalSessionId === 'number' && user.internalSessionId > 0
          ? user.internalSessionId
          : null;

      const resourceId = this.resolveResourceId(meta, req);
      const errorMessage = this.extractErrorMessage(err);

      // Fire-and-forget — não awaitamos. O service tem o seu try/catch e logger.
      void this.auditLogService.create({
        userId,
        sessionId,
        method: req.method,
        url: this.sanitizeUrl(this.extractFullUrl(req)),
        statusCode,
        duration: Date.now() - start,
        ip,
        userAgent,
        action: meta?.action ?? null,
        resourceType: meta?.resourceType ?? null,
        resourceId,
        status,
        errorMessage,
      });
    } catch (caught) {
      // Defesa em profundidade — se algo aqui rebentar, NUNCA propagar.
      this.logger.warn(
        `AuditLogInterceptor.write swallowed error: ${(caught as Error).message ?? 'unknown'}`,
      );
    }
  }

  private shouldSkip(path: string): boolean {
    if (SKIPPED_PATHS.has(path)) return true;
    return SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix));
  }

  private extractPath(req: AuthRequest): string {
    const url = req.originalUrl ?? req.url ?? '';
    const qIdx = url.indexOf('?');
    return qIdx >= 0 ? url.slice(0, qIdx) : url;
  }

  private extractFullUrl(req: AuthRequest): string {
    return req.originalUrl ?? req.url ?? '';
  }

  /** Mascara query params com `token`/`password`/`secret` e trunca a 2000 chars. */
  private sanitizeUrl(url: string): string {
    return url
      .replace(/([?&])(token|password|secret|api[_-]?key)=([^&]*)/gi, '$1$2=***')
      .slice(0, 2000);
  }

  private extractIp(req: AuthRequest): string | null {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) {
      const first = fwd.split(',')[0]?.trim();
      if (first) return first.slice(0, 45);
    }
    return (req.ip ?? null)?.slice(0, 45) ?? null;
  }

  private resolveResourceId(
    meta: AuditMetadata | undefined,
    req: AuthRequest,
  ): string | null {
    if (!meta?.resourceId) return null;
    if (typeof meta.resourceId === 'string') return meta.resourceId.slice(0, 100);
    try {
      const out = meta.resourceId(req);
      // Aceita string ou string[] (wildcard params do Express). Toma o primeiro
      // elemento do array se vier; descarta empty/null/undefined.
      const value = Array.isArray(out) ? out[0] : out;
      return typeof value === 'string' && value.length > 0 ? value.slice(0, 100) : null;
    } catch {
      return null; // resolver function rebentou — silencioso
    }
  }

  private extractErrorStatus(err: unknown): number | null {
    if (!err || typeof err !== 'object') return null;
    const candidate = (err as { status?: unknown; statusCode?: unknown }).status
      ?? (err as { statusCode?: unknown }).statusCode;
    return typeof candidate === 'number' ? candidate : null;
  }

  private extractErrorMessage(err: unknown): string | null {
    if (!err) return null;
    if (typeof err === 'string') return err.slice(0, 1000);
    if (typeof err !== 'object') return null;

    // HttpException: tenta extrair `error_code` (canónico em AppException) ou
    // `message` do body — mais útil ao admin do que o nome da classe.
    const getResponse = (err as { getResponse?: () => unknown }).getResponse;
    if (typeof getResponse === 'function') {
      try {
        const body = getResponse.call(err);
        if (typeof body === 'string') return body.slice(0, 1000);
        if (body && typeof body === 'object') {
          const errCode = (body as { error_code?: unknown }).error_code;
          if (typeof errCode === 'string') return errCode.slice(0, 1000);
          const bodyMsg = (body as { message?: unknown }).message;
          if (typeof bodyMsg === 'string') return bodyMsg.slice(0, 1000);
          if (Array.isArray(bodyMsg)) return bodyMsg.join('; ').slice(0, 1000);
        }
      } catch {
        // fall through to .message
      }
    }

    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') return msg.slice(0, 1000);
    return null;
  }
}
