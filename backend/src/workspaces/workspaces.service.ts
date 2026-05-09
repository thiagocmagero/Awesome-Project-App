import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * V1: cada utilizador tem exactamente 1 workspace (auto-criado no registo).
   * Em V2 isto vira `findManyForUser` ou aceita um `defaultWorkspaceId` no User.
   */
  async getDefaultForUser(userId: number) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { ownerId: userId },
    });
    if (!workspace) {
      throw new NotFoundException('WORKSPACE_NOT_FOUND');
    }
    return workspace;
  }

  async findByPublicId(publicId: string) {
    return this.prisma.workspace.findUnique({ where: { publicId } });
  }

  /**
   * Verifica se o utilizador tem acesso ao workspace.
   * Aceita: owner OU WorkspaceMember ACCEPTED.
   * Lança ForbiddenException se nenhum.
   */
  async assertAccess(workspaceId: number, userId: number): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (!workspace) throw new NotFoundException('WORKSPACE_NOT_FOUND');
    if (workspace.ownerId === userId) return;

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, status: 'ACCEPTED' },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('WORKSPACE_ACCESS_DENIED');
  }
}
