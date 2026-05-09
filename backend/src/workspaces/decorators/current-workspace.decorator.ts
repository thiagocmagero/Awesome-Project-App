import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Param decorator para extrair o workspace resolvido pelo WorkspaceContextGuard.
 * Retorna o objecto `{ id, publicId, ownerId, name, ... }` populado em request.workspace.
 *
 * Uso:
 *   @Get('projects')
 *   list(@CurrentWorkspace() ws) { ... }
 */
export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.workspace;
  },
);
