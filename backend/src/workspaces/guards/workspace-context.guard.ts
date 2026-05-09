import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { WorkspacesService } from '../workspaces.service';
import { SKIP_WORKSPACE_CONTEXT_KEY } from '../decorators/skip-workspace-context.decorator';

/**
 * Resolve o workspace activo do utilizador a partir do header `X-Workspace-Id`.
 * Corre como APP_GUARD global, **depois** do `JwtAuthGuard` (para `req.user`
 * estar populado).
 *
 * - Endpoints com `@SkipWorkspaceContext()` ou sem `req.user` (públicos)
 *   passam sem exigir o header.
 * - Sem header em endpoint protegido → 400 `WORKSPACE_HEADER_MISSING`.
 * - Header inválido → 400 `WORKSPACE_NOT_FOUND`.
 * - Sem acesso (não-owner E não-membro ACCEPTED) → 403 `WORKSPACE_ACCESS_DENIED`.
 *
 * Após sucesso, popula `req.workspace = { id, publicId, ownerId, name, ... }`
 * para handlers consumirem via `@CurrentWorkspace()` ou `req.workspace`.
 */
@Injectable()
export class WorkspaceContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: { sub: number }; workspace?: unknown }>();

    // Bypass por decorator @SkipWorkspaceContext
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_WORKSPACE_CONTEXT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return true;

    // Endpoints sem JWT (públicos) — JwtAuthGuard ainda não correu OU é rota pública.
    // Não exigimos workspace context. Os endpoints workspace-scoped têm sempre
    // JwtAuthGuard antes deste, logo req.user está populado se chegarmos aqui.
    if (!req.user) return true;

    const headerValue = req.header('x-workspace-id');
    if (!headerValue) {
      throw new BadRequestException('WORKSPACE_HEADER_MISSING');
    }

    const workspace = await this.workspacesService.findByPublicId(headerValue);
    if (!workspace) {
      throw new BadRequestException('WORKSPACE_NOT_FOUND');
    }

    await this.workspacesService.assertAccess(workspace.id, req.user.sub);

    (req as any).workspace = workspace;
    return true;
  }
}
