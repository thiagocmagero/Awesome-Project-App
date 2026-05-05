import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PROJECT_ACTION_KEY } from '../decorators/require-project-permission.decorator';
import { ProjectPermissionsService } from '../project-permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProjectAction } from '../project-permissions';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: ProjectPermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<ProjectAction>(PROJECT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permission restriction — allow all authenticated users
    if (!action) return true;

    const request = context.switchToHttp().getRequest<{
      user?: { sub: number; profileCode?: string };
      params?: Record<string, string>;
    }>();

    const user = request.user;
    if (!user?.sub) throw new ForbiddenException('Autenticação necessária.');

    // Extract project identifier from route params.
    // Supports both :projectId (planning routes) and :id (projects routes).
    const projectPublicId = request.params?.projectId ?? request.params?.id;
    if (!projectPublicId) {
      throw new ForbiddenException('Projecto não identificado na rota.');
    }

    // Resolve publicId → numeric id
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    if (!project) throw new ForbiddenException('Projecto não encontrado.');

    const allowed = await this.permissionsService.can(
      project.id,
      user.sub,
      action,
      user.profileCode,
    );

    if (!allowed) {
      throw new ForbiddenException('Sem permissão para esta acção neste projecto.');
    }

    return true;
  }
}
