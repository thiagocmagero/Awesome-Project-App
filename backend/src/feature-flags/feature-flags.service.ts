import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { SetUserOverrideDto } from './dto/set-user-override.dto';

// Selects sem `id` numérico nem FKs internos. Resposta API usa só publicId.
const FEATURE_FLAG_SELECT = {
  publicId: true,
  key: true,
  label: true,
  description: true,
  enabledGlobally: true,
  createdAt: true,
  updatedAt: true,
} as const;

const FEATURE_FLAG_FULL_SELECT = {
  ...FEATURE_FLAG_SELECT,
  planFlags: {
    select: {
      publicId: true,
      enabled: true,
      plan: { select: { publicId: true, code: true, name: true } },
    },
  },
  _count: { select: { userFlags: true } },
} as const;

const USER_FEATURE_FLAG_SELECT = {
  publicId: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
  user:        { select: { publicId: true, name: true, email: true } },
  featureFlag: { select: { publicId: true, key: true, label: true } },
} as const;

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Resolve helpers ─────────────────────────────────────────────────────

  private async resolveFlag(publicId: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { publicId } });
    if (!flag) throw new NotFoundException(`FeatureFlag '${publicId}' não encontrada.`);
    return flag;
  }

  private async resolveFlagId(publicId: string): Promise<number> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!flag) throw new NotFoundException(`FeatureFlag '${publicId}' não encontrada.`);
    return flag.id;
  }

  private async resolveUserId(publicId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`Utilizador '${publicId}' não encontrado.`);
    return user.id;
  }

  private async resolveUserOverrideId(publicId: string): Promise<number> {
    const override = await this.prisma.userFeatureFlag.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!override) throw new NotFoundException(`Override '${publicId}' não encontrado.`);
    return override.id;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.featureFlag.findMany({
      orderBy: { id: 'asc' },
      select: FEATURE_FLAG_FULL_SELECT,
    });
  }

  async create(dto: CreateFeatureFlagDto) {
    const existing = await this.prisma.featureFlag.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException(`Key '${dto.key}' já está em uso.`);

    return this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        label: dto.label,
        description: dto.description,
        enabledGlobally: dto.enabledGlobally ?? false,
      },
      select: FEATURE_FLAG_SELECT,
    });
  }

  async update(publicId: string, dto: UpdateFeatureFlagDto) {
    const flagId = await this.resolveFlagId(publicId);

    const data: Record<string, unknown> = {};
    if ('label' in dto) data.label = dto.label;
    if ('description' in dto) data.description = dto.description;
    if ('enabledGlobally' in dto) data.enabledGlobally = dto.enabledGlobally;

    return this.prisma.featureFlag.update({
      where: { id: flagId },
      data,
      select: FEATURE_FLAG_SELECT,
    });
  }

  async remove(publicId: string) {
    const flagId = await this.resolveFlagId(publicId);
    await this.prisma.featureFlag.delete({ where: { id: flagId } });
    return { deleted: publicId };
  }

  // ── User Overrides ──────────────────────────────────────────────────────

  async setUserOverride(dto: SetUserOverrideDto) {
    const featureFlagId = await this.resolveFlagId(dto.featureFlagId);
    const userId = await this.resolveUserId(dto.userId);

    return this.prisma.userFeatureFlag.upsert({
      where: { userId_featureFlagId: { userId, featureFlagId } },
      update: { enabled: dto.enabled },
      create: { userId, featureFlagId, enabled: dto.enabled },
      select: USER_FEATURE_FLAG_SELECT,
    });
  }

  async removeUserOverride(publicId: string) {
    const id = await this.resolveUserOverrideId(publicId);
    await this.prisma.userFeatureFlag.delete({ where: { id } });
    return { deleted: publicId };
  }

  // ── Resolution logic ────────────────────────────────────────────────────

  /**
   * Resolve if a feature is enabled for a specific user.
   * Priority: enabledGlobally → user override → plan flag → false
   * NOTE: receives numeric userId internally (from JWT sub)
   */
  async isEnabled(userId: number, flagKey: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key: flagKey } });
    if (!flag) return false;

    // 1. Global switch
    if (flag.enabledGlobally) return true;

    // 2. Per-user override
    const userOverride = await this.prisma.userFeatureFlag.findUnique({
      where: { userId_featureFlagId: { userId, featureFlagId: flag.id } },
    });
    if (userOverride) return userOverride.enabled;

    // 3. Plan-level flag
    const activePlan = await this.prisma.userPlan.findFirst({
      where: { userId, isActive: true },
      select: { planId: true },
    });
    if (activePlan) {
      const planFlag = await this.prisma.planFeatureFlag.findUnique({
        where: { planId_featureFlagId: { planId: activePlan.planId, featureFlagId: flag.id } },
      });
      if (planFlag) return planFlag.enabled;
    }

    // 4. Default
    return false;
  }

  /**
   * Get all flags with resolved status for a user.
   * NOTE: receives numeric userId internally (from JWT sub)
   */
  async getResolvedFlags(userId: number) {
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    const results: Array<{ key: string; label: string; enabled: boolean }> = [];

    for (const flag of flags) {
      const enabled = await this.isEnabled(userId, flag.key);
      results.push({ key: flag.key, label: flag.label, enabled });
    }

    return results;
  }
}
