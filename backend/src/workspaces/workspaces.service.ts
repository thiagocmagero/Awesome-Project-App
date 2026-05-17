import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * V2 (Maio 2026): user pode ter N workspaces owned. "Default" = mais antigo
   * (orderBy createdAt asc), preservando semântica V1 para users com 1 workspace.
   */
  async getDefaultForUser(userId: number) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!workspace) {
      throw new NotFoundException('WORKSPACE_NOT_FOUND');
    }
    return workspace;
  }

  /**
   * Lista todos os workspaces acessíveis ao user — owned + WorkspaceMember(ACCEPTED).
   * Ordenado por (mais antigo primeiro) para o "default" ficar sempre no topo.
   * Devolve já no formato pronto para o frontend (publicId, name, glyph, role, color).
   */
  async findAllForUser(userId: number) {
    const ownedRows = await this.prisma.workspace.findMany({
      where: { ownerId: userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, publicId: true, name: true, createdAt: true, status: true },
    });
    const memberRows = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
        status: 'ACCEPTED',
        workspace: { status: 'ACTIVE' },
        // Exclui workspaces onde o user também é owner (já no ownedRows acima).
        workspaceId: { notIn: ownedRows.map((w) => w.id) },
      },
      orderBy: { workspace: { createdAt: 'asc' } },
      select: {
        memberType: true,
        workspace: {
          select: { id: true, publicId: true, name: true, createdAt: true, status: true },
        },
      },
    });

    const owned = ownedRows.map((w) => ({
      publicId: w.publicId,
      name: w.name,
      status: w.status,
      createdAt: w.createdAt,
      role: 'OWNER' as const,
    }));
    const member = memberRows.map((m) => ({
      publicId: m.workspace.publicId,
      name: m.workspace.name,
      status: m.workspace.status,
      createdAt: m.workspace.createdAt,
      role: m.memberType, // 'BASIC' | 'LICENSED'
    }));
    return [...owned, ...member];
  }

  /**
   * Cria um workspace novo cujo `ownerId` é o user autenticado.
   * Em transacção: cria Workspace + Subscription default (via createDefaultBilling).
   * Sem auto-criar `WorkspaceMember` para o owner — ownership vive em `Workspace.ownerId`.
   */
  async createWorkspace(userId: number, name: string) {
    const trimmed = name?.trim();
    if (!trimmed) throw new BadRequestException('WORKSPACE_NAME_REQUIRED');
    if (trimmed.length > 80) throw new BadRequestException('WORKSPACE_NAME_TOO_LONG');

    return this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { ownerId: userId, name: trimmed },
      });
      // V2: cada workspace ganha a sua Subscription default. Não é o helper canónico
      // (que assume 1:1 user→workspace); aqui criamos directamente para este ws.
      const defaultPlan = await tx.plan.findFirst({
        where: { isDefault: true, planStatus: 'ACTIVE' },
        select: { id: true },
      });
      if (defaultPlan) {
        const now = new Date();
        const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
        await tx.subscription.create({
          data: {
            workspaceId: ws.id,
            planId: defaultPlan.id,
            status: 'ACTIVE',
            billingCycle: 'MONTHLY',
            currentPeriodStart: now,
            currentPeriodEnd: farFuture,
            extraSeats: 0,
          },
        });
      }
      return ws;
    });
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

