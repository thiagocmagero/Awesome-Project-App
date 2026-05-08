import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../plans/subscriptions.service';

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

  /** Atomically increment a usage counter */
  async increment(userId: number, usageKey: string): Promise<void> {
    await this.prisma.usageRecord.upsert({
      where: { userId_usageKey: { userId, usageKey } },
      update: { currentValue: { increment: 1 } },
      create: { userId, usageKey, currentValue: 1 },
    });
  }

  /** Atomically decrement a usage counter (min 0) */
  async decrement(userId: number, usageKey: string): Promise<void> {
    const record = await this.prisma.usageRecord.findUnique({
      where: { userId_usageKey: { userId, usageKey } },
    });
    if (!record || record.currentValue <= 0) return;

    await this.prisma.usageRecord.update({
      where: { userId_usageKey: { userId, usageKey } },
      data: { currentValue: { decrement: 1 } },
    });
  }

  /**
   * Incrementa um contador por `n` (usado quando o consumo não é unitário,
   * ex.: `max_storage_mb` que adiciona MB de cada upload). Atómico via
   * Prisma update operator.
   */
  async incrementBy(userId: number, usageKey: string, n: number): Promise<void> {
    if (n <= 0) return;
    await this.prisma.usageRecord.upsert({
      where: { userId_usageKey: { userId, usageKey } },
      update: { currentValue: { increment: n } },
      create: { userId, usageKey, currentValue: n },
    });
  }

  /**
   * Decrementa por `n`, clamp a zero. Não cria registo se ainda não existe
   * (não faz sentido decrementar antes do primeiro uso).
   */
  async decrementBy(userId: number, usageKey: string, n: number): Promise<void> {
    if (n <= 0) return;
    const record = await this.prisma.usageRecord.findUnique({
      where: { userId_usageKey: { userId, usageKey } },
    });
    if (!record || record.currentValue <= 0) return;
    const next = Math.max(0, record.currentValue - n);
    await this.prisma.usageRecord.update({
      where: { userId_usageKey: { userId, usageKey } },
      data: { currentValue: next },
    });
  }

  /**
   * Ajusta o contador por `delta` (sinal indica direcção). Wrapper conveniente
   * para callers que não sabem antecipadamente se o consumo aumenta ou
   * diminui (ex.: `FilesService.replaceContent` que pode trocar bytes
   * por mais ou menos do que tinha).
   */
  async adjustBy(userId: number, usageKey: string, delta: number): Promise<void> {
    if (delta > 0) await this.incrementBy(userId, usageKey, delta);
    else if (delta < 0) await this.decrementBy(userId, usageKey, -delta);
  }

  /**
   * Check if a user can still create a resource (within plan limit).
   *
   * Phase 5: aceita `ctx.projectPublicId` — quando presente E o requesting
   * user é LICENSED no workspace do owner do projecto, conta contra os
   * limites do owner em vez dos próprios. Sem contexto, comportamento legado.
   */
  async checkLimit(
    userId: number,
    usageKey: string,
    ctx?: { projectPublicId?: string | null },
  ): Promise<LimitCheckResult> {
    // Resolve effective owner para contagem + limite
    const effectiveOwnerId = await this.subscriptions.resolveEffectiveOwnerId(userId, ctx);

    // Count real resources from database (against effective owner)
    const current = await this.countReal(effectiveOwnerId, usageKey);

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

  /** Count real resources from database for an owner (effective). */
  private async countReal(ownerId: number, usageKey: string): Promise<number> {
    switch (usageKey) {
      case 'max_projects':
        return this.prisma.project.count({ where: { ownerId, status: 'ACTIVE' } });
      case 'max_teams':
        return this.prisma.team.count({ where: { ownerId, status: 'ACTIVE' } });
      case 'max_members': {
        // LICENSED workspace members consomem seats — Phase 5 conta isto.
        return this.prisma.workspaceMember.count({
          where: { ownerId, memberType: 'LICENSED', status: 'ACCEPTED' },
        });
      }
      case 'max_licensed_seats': {
        // Idem ao max_members — chave nova canónica para o painel /settings/users.
        return this.prisma.workspaceMember.count({
          where: { ownerId, memberType: 'LICENSED', status: 'ACCEPTED' },
        });
      }
      case 'max_tasks': {
        // Tasks in projects owned by this owner
        const projects = await this.prisma.project.findMany({
          where: { ownerId, status: 'ACTIVE' },
          select: { id: true },
        });
        if (projects.length === 0) return 0;
        return this.prisma.ganttTask.count({
          where: { projectId: { in: projects.map(p => p.id) } },
        });
      }
      case 'max_uploads_count': {
        // Active files in projects owned by this owner. Indexed por
        // (projectId, status) — query rápida mesmo com muitos files.
        const projects = await this.prisma.project.findMany({
          where: { ownerId, status: 'ACTIVE' },
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
        // For storage, API calls etc. — use the stored counter (per-owner)
        const record = await this.prisma.usageRecord.findUnique({
          where: { userId_usageKey: { userId: ownerId, usageKey } },
        });
        return record?.currentValue ?? 0;
    }
  }

  /** Get full usage summary for a user with all plan limits (real-time counts).
   *  Phase 5: usa Subscription do próprio user (sem contexto) — para a página
   *  "Meu plano" / dashboard. Para vista do workspace owner, ver alternativa
   *  no SubscriptionsService. */
  async getUsageSummary(userId: number): Promise<UsageSummaryItem[]> {
    const planId = await this.subscriptions.resolvePlanIdForContext(userId);
    if (!planId) return [];

    const limits = await this.prisma.planLimit.findMany({ where: { planId } });
    const results: UsageSummaryItem[] = [];

    for (const limit of limits) {
      const current = await this.countReal(userId, limit.limitKey);
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
