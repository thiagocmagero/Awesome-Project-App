import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../plans/subscriptions.service';
import { LimitKey } from '../common/entitlements';

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number; // -1 = unlimited
  percentage: number; // 0-100, 0 if unlimited
}

export interface UsageSummaryItem {
  usageKey: string;
  current: number;
  limit: number;
  percentage: number;
  description: string | null;
}

@Injectable()
export class UsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /** Atomically increment a usage counter (workspace-scoped) */
  async increment(workspaceId: number, usageKey: LimitKey): Promise<void> {
    await this.prisma.usageRecord.upsert({
      where: { workspaceId_usageKey: { workspaceId, usageKey } },
      update: { currentValue: { increment: 1 } },
      create: { workspaceId, usageKey, currentValue: 1 },
    });
  }

  /** Atomically decrement a usage counter (min 0) */
  async decrement(workspaceId: number, usageKey: LimitKey): Promise<void> {
    const record = await this.prisma.usageRecord.findUnique({
      where: { workspaceId_usageKey: { workspaceId, usageKey } },
    });
    if (!record || record.currentValue <= 0) return;

    await this.prisma.usageRecord.update({
      where: { workspaceId_usageKey: { workspaceId, usageKey } },
      data: { currentValue: { decrement: 1 } },
    });
  }

  /**
   * Incrementa um contador por `n` (usado quando o consumo não é unitário,
   * ex.: `max_storage_mb` que adiciona MB de cada upload). Atómico via
   * Prisma update operator.
   */
  async incrementBy(workspaceId: number, usageKey: LimitKey, n: number): Promise<void> {
    if (n <= 0) return;
    await this.prisma.usageRecord.upsert({
      where: { workspaceId_usageKey: { workspaceId, usageKey } },
      update: { currentValue: { increment: n } },
      create: { workspaceId, usageKey, currentValue: n },
    });
  }

  /**
   * Decrementa por `n`, clamp a zero. Não cria registo se ainda não existe
   * (não faz sentido decrementar antes do primeiro uso).
   */
  async decrementBy(workspaceId: number, usageKey: LimitKey, n: number): Promise<void> {
    if (n <= 0) return;
    const record = await this.prisma.usageRecord.findUnique({
      where: { workspaceId_usageKey: { workspaceId, usageKey } },
    });
    if (!record || record.currentValue <= 0) return;
    const next = Math.max(0, record.currentValue - n);
    await this.prisma.usageRecord.update({
      where: { workspaceId_usageKey: { workspaceId, usageKey } },
      data: { currentValue: next },
    });
  }

  /**
   * Ajusta o contador por `delta` (sinal indica direcção). Wrapper conveniente
   * para callers que não sabem antecipadamente se o consumo aumenta ou
   * diminui (ex.: `FilesService.replaceContent` que pode trocar bytes
   * por mais ou menos do que tinha).
   */
  async adjustBy(workspaceId: number, usageKey: LimitKey, delta: number): Promise<void> {
    if (delta > 0) await this.incrementBy(workspaceId, usageKey, delta);
    else if (delta < 0) await this.decrementBy(workspaceId, usageKey, -delta);
  }

  /**
   * Check if a workspace can still create a resource (within plan limit).
   *
   * Aceita `ctx.projectPublicId` — quando presente E o requesting user é
   * LICENSED no workspace do owner do projecto, conta contra o workspace
   * desse owner em vez do default do user. Sem contexto, usa default workspace.
   */
  async checkLimit(
    userId: number,
    usageKey: LimitKey,
    ctx?: { projectPublicId?: string | null },
  ): Promise<LimitCheckResult> {
    // Resolve effective workspace (LICENSED-aware)
    const effectiveWorkspaceId = await this.subscriptions.resolveEffectiveWorkspaceId(userId, ctx);

    // Count real resources from database (against effective workspace)
    const current = await this.countReal(effectiveWorkspaceId, usageKey);

    // Get plan limit via Subscription (context-aware, com fallback)
    const planId = await this.subscriptions.resolvePlanIdForContext(userId, ctx);

    if (!planId) {
      // Sem plano resolvível = sem limites (shouldn't happen com default plan)
      return { allowed: true, current, limit: -1, percentage: 0 };
    }

    const planLimit = await this.prisma.planLimit.findUnique({
      where: { planId_limitKey: { planId, limitKey: usageKey } },
    });

    if (!planLimit) {
      // No limit defined for this key = unlimited
      return { allowed: true, current, limit: -1, percentage: 0 };
    }

    const limit = planLimit.limitValue;
    if (limit === -1) {
      return { allowed: true, current, limit: -1, percentage: 0 };
    }

    const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0;
    return { allowed: current < limit, current, limit, percentage };
  }

  /** Count real resources from database for a workspace. */
  private async countReal(workspaceId: number, usageKey: string): Promise<number> {
    switch (usageKey) {
      case LimitKey.MAX_PROJECTS:
        return this.prisma.project.count({ where: { workspaceId, status: 'ACTIVE' } });
      case LimitKey.MAX_TEAMS:
        return this.prisma.team.count({ where: { workspaceId, status: 'ACTIVE' } });
      case LimitKey.MAX_MEMBERS: {
        // LICENSED workspace members consomem seats.
        return this.prisma.workspaceMember.count({
          where: { workspaceId, memberType: 'LICENSED', status: 'ACCEPTED' },
        });
      }
      case LimitKey.MAX_LICENSED_SEATS: {
        // Idem ao max_members — chave nova canónica para o painel /settings/users.
        return this.prisma.workspaceMember.count({
          where: { workspaceId, memberType: 'LICENSED', status: 'ACCEPTED' },
        });
      }
      case LimitKey.MAX_TASKS: {
        // Tasks in projects of this workspace
        const projects = await this.prisma.project.findMany({
          where: { workspaceId, status: 'ACTIVE' },
          select: { id: true },
        });
        if (projects.length === 0) return 0;
        return this.prisma.task.count({
          where: { projectId: { in: projects.map(p => p.id) } },
        });
      }
      case LimitKey.MAX_UPLOADS_COUNT: {
        // Active files in projects of this workspace. Indexed por
        // (projectId, status) — query rápida mesmo com muitos files.
        const projects = await this.prisma.project.findMany({
          where: { workspaceId, status: 'ACTIVE' },
          select: { id: true },
        });
        if (projects.length === 0) return 0;
        return this.prisma.file.count({
          where: { projectId: { in: projects.map(p => p.id) }, status: 'ACTIVE' },
        });
      }
      // `max_storage_mb` cai no default (counter UsageRecord) — somar
      // sizeBytes do `File` em cada checkLimit seria O(N) e é caminho
      // crítico do upload. O counter é mantido em sync por
      // FilesService.upload/replace/delete via incrementBy/decrementBy.
      default:
        // For storage, API calls etc. — use the stored counter (per-workspace)
        const record = await this.prisma.usageRecord.findUnique({
          where: { workspaceId_usageKey: { workspaceId, usageKey } },
        });
        return record?.currentValue ?? 0;
    }
  }

  /** Get full usage summary for a user with all plan limits (real-time counts).
   *  Usa Subscription do default workspace do user (sem contexto de projecto). */
  async getUsageSummary(userId: number): Promise<UsageSummaryItem[]> {
    const workspaceId = await this.subscriptions.resolveEffectiveWorkspaceId(userId);
    const planId = await this.subscriptions.resolvePlanIdForContext(userId);
    if (!planId) return [];

    const limits = await this.prisma.planLimit.findMany({ where: { planId } });
    const results: UsageSummaryItem[] = [];

    for (const limit of limits) {
      const current = await this.countReal(workspaceId, limit.limitKey);
      const limitValue = limit.limitValue;
      const percentage = limitValue > 0 && limitValue !== -1
        ? Math.round((current / limitValue) * 100)
        : 0;

      results.push({
        usageKey: limit.limitKey,
        current,
        limit: limitValue,
        percentage,
        description: limit.description,
      });
    }

    return results;
  }
}
