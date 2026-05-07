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
 * Service central de subscrições. A partir da Phase 5 torna-se a fonte de
 * verdade para resolução de features/limits via `getResolvedPlanForOwner`.
 *
 * Em Phase 4, é introduzido em paralelo com o `UserPlan` (dual-write) — o
 * `assign` admin já actualiza ambos via `setSubscription`.
 */
@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Subscrição activa do utilizador (ou null se nunca registada). */
  async getActiveSubscriptionForUser(userId: number) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: { select: { publicId: true, code: true, name: true } },
      },
    });
  }

  /**
   * Devolve o plano que define features/limits para um owner.
   *
   * Regra:
   * - Se a subscrição existir e tiver acesso activo → usa o plano da subscrição.
   * - Caso contrário (EXPIRED, sem subscrição) → fallback para o plano default
   *   da plataforma. Garante que features básicas continuam disponíveis após
   *   expiração de trial sem cobrança.
   */
  async getResolvedPlanForOwner(ownerId: number) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId: ownerId },
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

  /**
   * Upsert da subscrição. Usado pelo `PlansService.assign` (admin atribui plano)
   * para manter o write-through em conjunto com o legado `UserPlan`.
   *
   * Aceita `client` para se inserir numa transacção existente.
   */
  async setSubscription(
    client: PrismaLike,
    args: {
      userId: number;
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

    return client.subscription.upsert({
      where: { userId: args.userId },
      create: {
        userId: args.userId,
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
   *
   * Regra única usada em todos os pontos de resolução (Phase 5+):
   * - `ACTIVE` / `TRIALING` / `PAST_DUE` → acesso.
   * - `CANCELED` → acesso até `currentPeriodEnd` (grace period).
   * - `EXPIRED` / `PAUSED` / `INCOMPLETE` → sem acesso.
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
   * Resolução context-aware do owner cujo plano se aplica ao requesting user.
   *
   * Regra (Phase 5):
   * - Sem `projectPublicId` → `requestingUserId` (plano próprio).
   * - Com `projectPublicId`:
   *   - Se requesting user é o owner → plano próprio.
   *   - Se é `WorkspaceMember(LICENSED, ACCEPTED)` desse owner → plano do owner.
   *   - Caso contrário (BASIC, ou não-membro) → plano próprio.
   *
   * Devolve `null` se o projectPublicId não resolver (project não existe).
   */
  async resolveEffectiveOwnerId(
    requestingUserId: number,
    ctx?: { projectPublicId?: string | null },
  ): Promise<number> {
    if (!ctx?.projectPublicId) return requestingUserId;

    const project = await this.prisma.project.findUnique({
      where: { publicId: ctx.projectPublicId },
      select: { ownerId: true },
    });
    if (!project?.ownerId) return requestingUserId;
    if (project.ownerId === requestingUserId) return requestingUserId;

    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        ownerId: project.ownerId,
        userId: requestingUserId,
        status: 'ACCEPTED',
        memberType: 'LICENSED',
      },
      select: { id: true },
    });

    return member ? project.ownerId : requestingUserId;
  }

  /**
   * Resolve o `planId` que define features/limits para um requesting user num
   * dado contexto. Encapsula resolução context-aware + fallback para o plano
   * default quando a subscrição não confere acesso.
   *
   * Devolve `null` se nem a subscrição nem o default plan estiverem disponíveis.
   */
  async resolvePlanIdForContext(
    requestingUserId: number,
    ctx?: { projectPublicId?: string | null },
  ): Promise<number | null> {
    const effectiveOwnerId = await this.resolveEffectiveOwnerId(requestingUserId, ctx);

    const sub = await this.prisma.subscription.findUnique({
      where: { userId: effectiveOwnerId },
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
