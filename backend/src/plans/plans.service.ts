import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpsertPlanLimitDto } from './dto/upsert-plan-limit.dto';
import { UpsertPlanPricingDto } from './dto/upsert-plan-pricing.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { SubscriptionsService } from './subscriptions.service';
import { createDefaultBilling } from '../users/billing-helpers';

// Selects explícitos — nunca expor `id` numérico nem FKs internos (`planId`,
// `featureFlagId`). Resposta usa só `publicId` em todas as relações. Frontend
// (PlansPage.tsx) já só consome publicIds.
const PLAN_SELECT = {
  publicId: true,
  code: true,
  name: true,
  description: true,
  planStatus: true,
  validUntil: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  limits: {
    select: {
      publicId: true,
      limitKey: true,
      limitValue: true,
      description: true,
    },
  },
  pricing: {
    select: {
      publicId: true,
      billingCycle: true,
      basePrice: true,
      promotionalPrice: true,
      promotionEndDate: true,
      trialDays: true,
    },
  },
  featureFlags: {
    select: {
      publicId: true,
      enabled: true,
      featureFlag: { select: { publicId: true, key: true, label: true } },
    },
  },
  // Phase 7: count active subscriptions (replaces userPlans count).
  _count: {
    select: {
      subscriptions: {
        where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] as ('ACTIVE' | 'TRIALING' | 'PAST_DUE')[] } },
      },
    },
  },
} as const;

const PLAN_LIMIT_SELECT = {
  publicId: true,
  limitKey: true,
  limitValue: true,
  description: true,
} as const;

const PLAN_PRICING_SELECT = {
  publicId: true,
  billingCycle: true,
  basePrice: true,
  promotionalPrice: true,
  promotionEndDate: true,
  trialDays: true,
} as const;

const PLAN_FEATURE_FLAG_SELECT = {
  publicId: true,
  enabled: true,
  featureFlag: { select: { publicId: true, key: true, label: true } },
} as const;

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // ── Resolve helpers ─────────────────────────────────────────────────────

  private async resolvePlan(publicId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { publicId },
      select: PLAN_SELECT,
    });
    if (!plan) throw new AppException('PLAN_NOT_FOUND', HttpStatus.NOT_FOUND);
    return plan;
  }

  private async resolvePlanId(publicId: string): Promise<number> {
    const plan = await this.prisma.plan.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!plan) throw new AppException('PLAN_NOT_FOUND', HttpStatus.NOT_FOUND);
    return plan.id;
  }

  private async resolveUserId(publicId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!user) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return user.id;
  }

  private async resolveFeatureFlagId(publicId: string): Promise<number> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!flag) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return flag.id;
  }

  private async resolvePlanLimitId(publicId: string): Promise<number> {
    const limit = await this.prisma.planLimit.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!limit) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return limit.id;
  }

  private async resolvePlanPricingId(publicId: string): Promise<number> {
    const pricing = await this.prisma.planPricing.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!pricing) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return pricing.id;
  }

  private async resolvePlanFeatureFlagId(publicId: string): Promise<number> {
    const pf = await this.prisma.planFeatureFlag.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!pf) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return pf.id;
  }

  // ── Plans CRUD ──────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { id: 'asc' },
      select: PLAN_SELECT,
    });
  }

  async findOne(publicId: string) {
    return this.resolvePlan(publicId);
  }

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({ where: { code: dto.code } });
    if (existing) throw new AppException('PLAN_CODE_EXISTS', HttpStatus.CONFLICT);

    if (dto.isDefault) {
      await this.prisma.plan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    return this.prisma.plan.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isDefault: dto.isDefault ?? false,
      },
      select: PLAN_SELECT,
    });
  }

  async update(publicId: string, dto: UpdatePlanDto) {
    const id = await this.resolvePlanId(publicId);

    if (dto.isDefault) {
      await this.prisma.plan.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if ('name' in dto) data.name = dto.name;
    if ('description' in dto) data.description = dto.description;
    if ('planStatus' in dto) data.planStatus = dto.planStatus;
    if ('validUntil' in dto) data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if ('isDefault' in dto) data.isDefault = dto.isDefault;

    return this.prisma.plan.update({
      where: { id },
      data,
      select: PLAN_SELECT,
    });
  }

  // ── Limits ──────────────────────────────────────────────────────────────

  async upsertLimit(planPublicId: string, dto: UpsertPlanLimitDto) {
    const planId = await this.resolvePlanId(planPublicId);

    return this.prisma.planLimit.upsert({
      where: { planId_limitKey: { planId, limitKey: dto.limitKey } },
      update: { limitValue: dto.limitValue, description: dto.description },
      create: { planId, limitKey: dto.limitKey, limitValue: dto.limitValue, description: dto.description },
      select: PLAN_LIMIT_SELECT,
    });
  }

  async removeLimit(planPublicId: string, limitPublicId: string) {
    const planId = await this.resolvePlanId(planPublicId);
    const limitId = await this.resolvePlanLimitId(limitPublicId);

    const limit = await this.prisma.planLimit.findFirst({ where: { id: limitId, planId } });
    if (!limit) throw new AppException('PLAN_NOT_FOUND', HttpStatus.NOT_FOUND);
    await this.prisma.planLimit.delete({ where: { id: limitId } });
    return { deleted: limitPublicId };
  }

  // ── Pricing ─────────────────────────────────────────────────────────────

  async upsertPricing(planPublicId: string, dto: UpsertPlanPricingDto) {
    const planId = await this.resolvePlanId(planPublicId);

    return this.prisma.planPricing.upsert({
      where: { planId_billingCycle: { planId, billingCycle: dto.billingCycle } },
      update: {
        basePrice: dto.basePrice,
        promotionalPrice: dto.promotionalPrice,
        promotionEndDate: dto.promotionEndDate ? new Date(dto.promotionEndDate) : null,
        trialDays: dto.trialDays ?? 0,
      },
      create: {
        planId,
        billingCycle: dto.billingCycle,
        basePrice: dto.basePrice,
        promotionalPrice: dto.promotionalPrice,
        promotionEndDate: dto.promotionEndDate ? new Date(dto.promotionEndDate) : null,
        trialDays: dto.trialDays ?? 0,
      },
      select: PLAN_PRICING_SELECT,
    });
  }

  async removePricing(planPublicId: string, pricingPublicId: string) {
    const planId = await this.resolvePlanId(planPublicId);
    const pricingId = await this.resolvePlanPricingId(pricingPublicId);

    const pricing = await this.prisma.planPricing.findFirst({ where: { id: pricingId, planId } });
    if (!pricing) throw new AppException('PLAN_NOT_FOUND', HttpStatus.NOT_FOUND);
    await this.prisma.planPricing.delete({ where: { id: pricingId } });
    return { deleted: pricingPublicId };
  }

  // ── Feature Flags association ───────────────────────────────────────────

  async addFeatureFlag(planPublicId: string, featureFlagPublicId: string, enabled: boolean) {
    const planId = await this.resolvePlanId(planPublicId);
    const featureFlagId = await this.resolveFeatureFlagId(featureFlagPublicId);

    const existing = await this.prisma.planFeatureFlag.findUnique({
      where: { planId_featureFlagId: { planId, featureFlagId } },
    });
    if (existing) throw new AppException('MEMBER_ALREADY_EXISTS', HttpStatus.CONFLICT);

    return this.prisma.planFeatureFlag.create({
      data: { planId, featureFlagId, enabled },
      select: PLAN_FEATURE_FLAG_SELECT,
    });
  }

  async updateFeatureFlag(planPublicId: string, pfPublicId: string, enabled: boolean) {
    const planId = await this.resolvePlanId(planPublicId);
    const pfId = await this.resolvePlanFeatureFlagId(pfPublicId);

    const pf = await this.prisma.planFeatureFlag.findFirst({ where: { id: pfId, planId } });
    if (!pf) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return this.prisma.planFeatureFlag.update({
      where: { id: pfId },
      data: { enabled },
      select: PLAN_FEATURE_FLAG_SELECT,
    });
  }

  async removeFeatureFlag(planPublicId: string, pfPublicId: string) {
    const planId = await this.resolvePlanId(planPublicId);
    const pfId = await this.resolvePlanFeatureFlagId(pfPublicId);

    const pf = await this.prisma.planFeatureFlag.findFirst({ where: { id: pfId, planId } });
    if (!pf) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    await this.prisma.planFeatureFlag.delete({ where: { id: pfId } });
    return { deleted: pfPublicId };
  }

  // ── Plan Assignment ─────────────────────────────────────────────────────

  async assign(dto: AssignPlanDto, assignedById: number) {
    const planId = await this.resolvePlanId(dto.planId);
    const userId = await this.resolveUserId(dto.userId);

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (plan!.planStatus !== 'ACTIVE') {
      throw new AppException('PLAN_LIMIT_REACHED', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.$transaction(async (tx) => {
      // Phase 7: única fonte de verdade — Subscription. UserPlan removido.
      const updated = await this.subscriptions.setSubscription(tx, {
        userId,
        planId,
        status: 'ACTIVE',
        currentPeriodEnd: dto.expiresAt ? new Date(dto.expiresAt) : null,
      });

      // Devolve forma compatível com a anterior (frontend PlansPage espera estes campos).
      const planRef = await tx.plan.findUniqueOrThrow({
        where: { id: planId },
        select: { publicId: true, code: true, name: true },
      });
      return {
        publicId: updated.publicId,
        isActive: true,
        assignedAt: updated.currentPeriodStart,
        expiresAt: updated.currentPeriodEnd,
        notes: dto.notes ?? null,
        plan: planRef,
      };
    });
  }

  /**
   * Phase 7: histórico de planos foi removido. Subscription é mutada em vez
   * de criar nova linha por mudança. Devolve apenas a subscrição actual como
   * uma lista de 1 elemento para preservar shape compatível com frontend.
   */
  async getUserPlanHistory(userPublicId: string) {
    const userId = await this.resolveUserId(userPublicId);
    // V2: workspace default = mais antigo de N possíveis.
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!workspace) return [];
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId: workspace.id },
      include: { plan: { select: { publicId: true, code: true, name: true } } },
    });
    if (!sub) return [];
    return [
      {
        publicId: sub.publicId,
        isActive: ['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(sub.status),
        assignedAt: sub.currentPeriodStart,
        expiresAt: sub.currentPeriodEnd,
        notes: null,
        plan: sub.plan,
        assignedBy: null,
      },
    ];
  }

  // ── Helper: get active plan for a user ──────────────────────────────────

  /** Phase 7: delegado a SubscriptionsService.getResolvedPlanForOwner. */
  async getActivePlan(userId: number) {
    return this.subscriptions.getResolvedPlanForOwner(userId);
  }

  /** Assign default plan to a user (used on registration). Pré-requisito:
   * o Workspace já tem que existir (auto-criado no hook de User creation). */
  async assignDefaultPlan(userId: number) {
    await createDefaultBilling(this.prisma, userId);
    // V2: workspace default = mais antigo.
    const workspace = await this.prisma.workspace.findFirst({
      where: { ownerId: userId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!workspace) return null;
    return this.prisma.subscription.findUnique({
      where: { workspaceId: workspace.id },
      include: { plan: true },
    });
  }
}
