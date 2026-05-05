import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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

  /** Check if a user can still create a resource (within plan limit) */
  async checkLimit(userId: number, usageKey: string): Promise<LimitCheckResult> {
    // Count real resources from database
    const current = await this.countReal(userId, usageKey);

    // Get plan limit
    const activePlan = await this.prisma.userPlan.findFirst({
      where: { userId, isActive: true },
      select: { planId: true },
    });

    if (!activePlan) {
      // No plan = no limits (shouldn't happen, but be safe)
      return { allowed: true, current, limit: -1, percentage: 0 };
    }

    const planLimit = await this.prisma.planLimit.findUnique({
      where: { planId_limitKey: { planId: activePlan.planId, limitKey: usageKey } },
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

  /** Count real resources from database for a user */
  private async countReal(userId: number, usageKey: string): Promise<number> {
    switch (usageKey) {
      case 'max_projects':
        return this.prisma.project.count({ where: { ownerId: userId, status: 'ACTIVE' } });
      case 'max_teams':
        return this.prisma.team.count({ where: { ownerId: userId, status: 'ACTIVE' } });
      case 'max_members': {
        // Users created by this user (their workspace)
        return this.prisma.user.count({ where: { createdById: userId, status: 'ACTIVE' } });
      }
      case 'max_tasks': {
        // Tasks in projects owned by this user
        const projects = await this.prisma.project.findMany({
          where: { ownerId: userId, status: 'ACTIVE' },
          select: { id: true },
        });
        if (projects.length === 0) return 0;
        return this.prisma.ganttTask.count({
          where: { projectId: { in: projects.map(p => p.id) } },
        });
      }
      default:
        // For storage, API calls etc. — use the stored counter
        const record = await this.prisma.usageRecord.findUnique({
          where: { userId_usageKey: { userId, usageKey } },
        });
        return record?.currentValue ?? 0;
    }
  }

  /** Get full usage summary for a user with all plan limits (real-time counts) */
  async getUsageSummary(userId: number): Promise<UsageSummaryItem[]> {
    const activePlan = await this.prisma.userPlan.findFirst({
      where: { userId, isActive: true },
      include: { plan: { include: { limits: true } } },
    });

    if (!activePlan) return [];

    const limits = activePlan.plan.limits;
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
