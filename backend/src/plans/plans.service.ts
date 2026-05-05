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

const PLAN_INCLUDE = {
  limits: true,
  pricing: true,
  featureFlags: { include: { featureFlag: true } },
  _count: { select: { userPlans: { where: { isActive: true } } } },
} as const;

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Resolve helpers ─────────────────────────────────────────────────────

  private async resolvePlan(publicId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { publicId },
      include: PLAN_INCLUDE,
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
      include: PLAN_INCLUDE,
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
      include: PLAN_INCLUDE,
    });
  }

  async update(publicId: string, dto: UpdatePlanDto) {
    const plan = await this.resolvePlan(publicId);
    const id = plan.id;

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
      include: PLAN_INCLUDE,
    });
  }

  // ── Limits ──────────────────────────────────────────────────────────────

  async upsertLimit(planPublicId: string, dto: UpsertPlanLimitDto) {
    const planId = await this.resolvePlanId(planPublicId);

    return this.prisma.planLimit.upsert({
      where: { planId_limitKey: { planId, limitKey: dto.limitKey } },
      update: { limitValue: dto.limitValue, description: dto.description },
      create: { planId, limitKey: dto.limitKey, limitValue: dto.limitValue, description: dto.description },
    });
  }

  async removeLimit(planPublicId: string, limitPublicId: string) {
    const planId = await this.resolvePlanId(planPublicId);
    const limitId = await this.resolvePlanLimitId(limitPublicId);

    const limit = await this.prisma.planLimit.findFirst({ where: { id: limitId, planId } });
    if (!limit) throw new AppException('PLAN_NOT_FOUND', HttpStatus.NOT_FOUND);
    return this.prisma.planLimit.delete({ where: { id: limitId } });
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
    });
  }

  async removePricing(planPublicId: string, pricingPublicId: string) {
    const planId = await this.resolvePlanId(planPublicId);
    const pricingId = await this.resolvePlanPricingId(pricingPublicId);

    const pricing = await this.prisma.planPricing.findFirst({ where: { id: pricingId, planId } });
    if (!pricing) throw new AppException('PLAN_NOT_FOUND', HttpStatus.NOT_FOUND);
    return this.prisma.planPricing.delete({ where: { id: pricingId } });
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
      include: { featureFlag: true },
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
      include: { featureFlag: true },
    });
  }

  async removeFeatureFlag(planPublicId: string, pfPublicId: string) {
    const planId = await this.resolvePlanId(planPublicId);
    const pfId = await this.resolvePlanFeatureFlagId(pfPublicId);

    const pf = await this.prisma.planFeatureFlag.findFirst({ where: { id: pfId, planId } });
    if (!pf) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return this.prisma.planFeatureFlag.delete({ where: { id: pfId } });
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
      // Deactivate all current plans
      await tx.userPlan.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Create new active assignment
      return tx.userPlan.create({
        data: {
          userId,
          planId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          isActive: true,
          assignedById,
          notes: dto.notes,
        },
        include: { plan: true },
      });
    });
  }

  async getUserPlanHistory(userPublicId: string) {
    const userId = await this.resolveUserId(userPublicId);

    return this.prisma.userPlan.findMany({
      where: { userId },
      orderBy: { assignedAt: 'desc' },
      include: {
        plan: { select: { id: true, publicId: true, code: true, name: true } },
        assignedBy: { select: { id: true, publicId: true, name: true, email: true } },
      },
    });
  }

  // ── Helper: get active plan for a user ──────────────────────────────────

  async getActivePlan(userId: number) {
    const userPlan = await this.prisma.userPlan.findFirst({
      where: { userId, isActive: true },
      include: { plan: { include: { limits: true, featureFlags: { include: { featureFlag: true } } } } },
    });
    return userPlan?.plan ?? null;
  }

  /** Assign default plan to a user (used on registration) */
  async assignDefaultPlan(userId: number) {
    const defaultPlan = await this.prisma.plan.findFirst({ where: { isDefault: true, planStatus: 'ACTIVE' } });
    if (!defaultPlan) return null;

    return this.prisma.userPlan.create({
      data: { userId, planId: defaultPlan.id, isActive: true },
    });
  }
}
