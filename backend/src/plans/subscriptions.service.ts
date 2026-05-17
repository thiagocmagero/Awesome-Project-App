import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Estados que conferem acesso pleno (sem `currentPeriodEnd` check).
 * `CANCELED` é tratado à parte porque depende do período actual.
 */
const ACTIVE_STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIALING', 'PAST_DUE'];

/**
 * Service central de subscrições. Após introdução do conceito explícito de
 * Workspace, a subscrição passa a ser **per-workspace** (1:1 com Workspace
 * em V1; mantém-se 1:1 em V2 quando users tiverem N workspaces, cada um com
 * a sua subscrição independente).
 */
@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve o workspace default do user (V2: mais antigo de N possíveis). */
  private async getDefaultWorkspaceIdForUser(userId: number): Promise<number | null> {
    const ws = await this.prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return ws?.id ?? null;
  }

  /** Subscrição activa do workspace default do utilizador (ou null). */
  async getActiveSubscriptionForUser(userId: number) {
    const workspaceId = await this.getDefaultWorkspaceIdForUser(userId);
    if (!workspaceId) return null;
    return this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: {
        plan: { select: { publicId: true, code: true, name: true } },
      },
    });
  }

  /**
   * Devolve o plano que define features/limits para um workspace.
   *
   * Regra:
   * - Se a subscrição existir e tiver acesso activo → usa o plano da subscrição.
   * - Caso contrário (EXPIRED, sem subscrição) → fallback para o plano default
   *   da plataforma. Garante que features básicas continuam disponíveis após
   *   expiração de trial sem cobrança.
   */
  async getResolvedPlanForWorkspace(workspaceId: number) {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: {
        plan: {
          include: {
            limits: true,
            featureFlags: { include: { featureFlag: true } },
          },
        },
      },
    });

    if (sub && this.hasActiveAccess(sub)) {
      return sub.plan;
    }

    return this.prisma.plan.findFirst({
      where: { isDefault: true, planStatus: 'ACTIVE' },
      include: {
        limits: true,
        featureFlags: { include: { featureFlag: true } },
      },
    });
  }

  /** Compat: resolve plano via workspace default do user. */
  async getResolvedPlanForOwner(ownerId: number) {
    const workspaceId = await this.getDefaultWorkspaceIdForUser(ownerId);
    if (!workspaceId) {
      return this.prisma.plan.findFirst({
        where: { isDefault: true, planStatus: 'ACTIVE' },
        include: {
          limits: true,
          featureFlags: { include: { featureFlag: true } },
        },
      });
    }
    return this.getResolvedPlanForWorkspace(workspaceId);
  }

  /**
   * Upsert da subscrição. Usado pelo `PlansService.assign` (admin atribui plano).
   * Aceita `client` para se inserir numa transacção existente.
   *
   * Aceita `userId` (resolve o workspace default) ou `workspaceId` directo.
   */
  async setSubscription(
    client: PrismaLike,
    args: {
      userId?: number;
      workspaceId?: number;
      planId: number;
      status?: SubscriptionStatus;
      currentPeriodEnd?: Date | null;
      extraSeats?: number;
    },
  ) {
    const now = new Date();
    const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
    const periodEnd = args.currentPeriodEnd ?? farFuture;
    const status = args.status ?? 'ACTIVE';

    let workspaceId = args.workspaceId;
    if (!workspaceId && args.userId) {
      // V2: workspace default = mais antigo.
      const ws = await client.workspace.findFirst({
        where: { ownerId: args.userId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!ws) {
        throw new Error(`No workspace for user ${args.userId} when setting subscription`);
      }
      workspaceId = ws.id;
    }
    if (!workspaceId) {
      throw new Error('setSubscription requires either userId or workspaceId');
    }

    return client.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        planId: args.planId,
        status,
        billingCycle: 'MONTHLY',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        extraSeats: args.extraSeats ?? 0,
      },
      update: {
        planId: args.planId,
        status,
        currentPeriodEnd: periodEnd,
        // Re-atribuir um plano limpa flags de cancelamento.
        cancelAtPeriodEnd: false,
        canceledAt: null,
        ...(args.extraSeats !== undefined ? { extraSeats: args.extraSeats } : {}),
      },
    });
  }

  /**
   * Helper canónico: esta subscrição confere acesso AGORA?
   */
  hasActiveAccess(sub: {
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
  }): boolean {
    if (ACTIVE_STATUSES.includes(sub.status)) return true;
    if (sub.status === 'CANCELED' && sub.currentPeriodEnd.getTime() > Date.now()) return true;
    return false;
  }

  /**
   * Resolução context-aware do workspace cujo plano se aplica ao requesting user.
   *
   * Regra:
   * - Sem `projectPublicId` → workspace default do user (V1: único).
   * - Com `projectPublicId`:
   *   - Se o projecto pertence ao workspace default do user → esse mesmo.
   *   - Se requesting user é `WorkspaceMember(LICENSED, ACCEPTED)` desse workspace → o workspace do projecto.
   *   - Caso contrário (BASIC, ou não-membro) → workspace default do user.
   */
  async resolveEffectiveWorkspaceId(
    requestingUserId: number,
    ctx?: { projectPublicId?: string | null },
  ): Promise<number> {
    const defaultWsId = await this.getDefaultWorkspaceIdForUser(requestingUserId);
    if (!ctx?.projectPublicId) {
      if (!defaultWsId) {
        throw new Error(`User ${requestingUserId} has no default workspace`);
      }
      return defaultWsId;
    }

    const project = await this.prisma.project.findUnique({
      where: { publicId: ctx.projectPublicId },
      select: { workspaceId: true, ownerId: true },
    });
    if (!project?.workspaceId) {
      // Project sem workspace (orphan) → cai no default do user
      if (!defaultWsId) {
        throw new Error(`User ${requestingUserId} has no default workspace`);
      }
      return defaultWsId;
    }

    // É o owner do projecto? (= owner do workspace em V1)
    if (project.ownerId === requestingUserId) return project.workspaceId;

    // É membro LICENSED do workspace do projecto?
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: requestingUserId,
        status: 'ACCEPTED',
        memberType: 'LICENSED',
      },
      select: { id: true },
    });

    if (member) return project.workspaceId;

    if (!defaultWsId) {
      throw new Error(`User ${requestingUserId} has no default workspace`);
    }
    return defaultWsId;
  }

  /**
   * Compat alias — código legado pode chamar este nome. Devolve o ownerId
   * do workspace efectivo (em V1: o mesmo userId, ou o owner do projecto
   * caso seja membro LICENSED).
   */
  async resolveEffectiveOwnerId(
    requestingUserId: number,
    ctx?: { projectPublicId?: string | null },
  ): Promise<number> {
    const wsId = await this.resolveEffectiveWorkspaceId(requestingUserId, ctx);
    const ws = await this.prisma.workspace.findUnique({
      where: { id: wsId },
      select: { ownerId: true },
    });
    return ws?.ownerId ?? requestingUserId;
  }

  /**
   * Resolve o `planId` que define features/limits para um requesting user num
   * dado contexto. Encapsula resolução context-aware + fallback para o plano
   * default quando a subscrição não confere acesso.
   */
  async resolvePlanIdForContext(
    requestingUserId: number,
    ctx?: { projectPublicId?: string | null },
  ): Promise<number | null> {
    const effectiveWorkspaceId = await this.resolveEffectiveWorkspaceId(requestingUserId, ctx);

    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId: effectiveWorkspaceId },
      select: { planId: true, status: true, currentPeriodEnd: true },
    });

    if (sub && this.hasActiveAccess(sub)) return sub.planId;

    const defaultPlan = await this.prisma.plan.findFirst({
      where: { isDefault: true, planStatus: 'ACTIVE' },
      select: { id: true },
    });
    return defaultPlan?.id ?? null;
  }
}
