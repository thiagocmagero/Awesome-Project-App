import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Fields included in every safe user response (never exposes passwordHash or internal IDs)
const USER_SELECT = {
  publicId: true,
  email: true,
  name: true,
  status: true,
  timezone: true,
  locale: true,
  phone: true,
  website: true,
  address: true,
  profile: { select: { publicId: true, code: true, label: true } },
  userType: { select: { publicId: true, code: true, label: true } },
  level: { select: { publicId: true, code: true, label: true, order: true } },
  userPlans: {
    where: { isActive: true },
    take: 1,
    select: { plan: { select: { publicId: true, code: true, name: true } } },
  },
  createdAt: true,
  updatedAt: true,
} as const;

// Internal select that includes numeric id, createdById and selfRegistered for ownership checks
const USER_SELECT_INTERNAL = {
  ...USER_SELECT,
  id: true,
  createdById: true,
  selfRegistered: true,
} as const;

const IS_ADMIN = (u: JwtPayload) => u.profileCode === 'PLATFORM_ADMIN';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Internal helpers ─────────────────────────────────────────────────────

  private async ensureEmailUnique(email: string, excludeId?: number) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== excludeId) {
      throw new AppException('EMAIL_ALREADY_EXISTS', HttpStatus.CONFLICT);
    }
  }

  /** Resolve a publicId to the internal numeric record, throwing if not found */
  private async resolveUser(publicId: string) {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      select: USER_SELECT_INTERNAL,
    });
    if (!user) throw new AppException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    return user;
  }

  /** Resolve a related entity publicId to its internal numeric id */
  private async resolveRelation(
    model: 'profile' | 'userType' | 'userLevel',
    publicId: string,
    label: string,
  ): Promise<number> {
    const prismaModel =
      model === 'profile'
        ? this.prisma.profile
        : model === 'userType'
          ? this.prisma.userType
          : this.prisma.userLevel;

    const record = await (prismaModel as any).findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!record) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return record.id;
  }

  /** Verifica que o utilizador tem permissão para aceder ao recurso */
  private assertOwnership(resourceId: number, resourceCreatedById: number | null, requestingUser: JwtPayload) {
    if (IS_ADMIN(requestingUser)) return;          // Admin pode tudo
    if (resourceId === requestingUser.sub) return;  // É o próprio utilizador
    if (resourceCreatedById === requestingUser.sub) return; // Criou este recurso
    throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
  }

  /** Strip internal fields (id, createdById, selfRegistered) from a user record before returning */
  private stripInternal(user: Record<string, unknown>) {
    const { id, createdById, selfRegistered, ...safe } = user;
    return safe;
  }

  // ── Public CRUD ──────────────────────────────────────────────────────────

  async create(dto: CreateUserDto, requestingUser: JwtPayload) {
    await this.ensureEmailUnique(dto.email);

    let profileId: number;

    if (IS_ADMIN(requestingUser)) {
      // PLATFORM_ADMIN must provide profileId and a valid password
      if (!dto.profileId) {
        throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
      }
      if (!dto.password || dto.password.trim().length < 8) {
        throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
      }
      profileId = await this.resolveRelation('profile', dto.profileId, 'Profile');
    } else {
      // BASIC_USER: profile is always BASIC_USER (never trust client)
      const basicProfile = await this.prisma.profile.findUnique({ where: { code: 'BASIC_USER' } });
      if (!basicProfile) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
      profileId = basicProfile.id;
    }

    // Resolve optional relations
    let userTypeId: number | undefined;
    if (dto.userTypeId) {
      userTypeId = await this.resolveRelation('userType', dto.userTypeId, 'UserType');
    }

    let levelId: number | undefined;
    if (dto.levelId) {
      levelId = await this.resolveRelation('userLevel', dto.levelId, 'UserLevel');
    }

    // If no password provided (BASIC_USER), generate a random one.
    // The person must use the password-reset flow to gain access (future feature).
    const rawPassword = dto.password?.trim() || randomUUID();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        profileId,
        userTypeId,
        levelId,
        createdById: requestingUser.sub,
      },
      select: { id: true },
    });

    // Assign default plan
    await this.assignDefaultPlan(user.id);

    // Re-fetch to include the plan
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: USER_SELECT });
  }

  /** Used by AuthService.register — assigns BASIC_USER profile by default.
   *  Returns USER_SELECT fields + internal `id` (needed by AuthService for JWT sub and invitation linking). */
  async createWithDefaultProfile(data: { email: string; name: string; passwordHash: string }) {
    await this.ensureEmailUnique(data.email);

    const basicUserProfile = await this.prisma.profile.findUnique({
      where: { code: 'BASIC_USER' },
    });

    if (!basicUserProfile) {
      throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        profileId: basicUserProfile.id,
        selfRegistered: true,
      },
      select: { id: true },
    });

    // Assign default plan
    await this.assignDefaultPlan(user.id);

    // Re-fetch to include the plan — also include internal id for AuthService
    return this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { ...USER_SELECT, id: true },
    });
  }

  async findAll(requestingUser: JwtPayload, filters?: { status?: Status }) {
    // BASIC_USER sees: users they created + themselves (so they can add themselves to teams/projects)
    const ownershipFilter = IS_ADMIN(requestingUser)
      ? {}
      : { OR: [{ createdById: requestingUser.sub }, { id: requestingUser.sub }] };

    const statusFilter = filters?.status ? { status: filters.status } : {};

    return this.prisma.user.findMany({
      where: { ...ownershipFilter, ...statusFilter },
      orderBy: { id: 'asc' },
      select: USER_SELECT,
    });
  }

  async findOne(publicId: string, requestingUser: JwtPayload) {
    const user = await this.resolveUser(publicId);
    this.assertOwnership(user.id, user.createdById, requestingUser);
    return this.stripInternal(user);
  }

  async update(publicId: string, dto: UpdateUserDto, requestingUser: JwtPayload) {
    const user = await this.resolveUser(publicId);
    this.assertOwnership(user.id, user.createdById, requestingUser);

    // After self-registration the user owns their own data —
    // only PLATFORM_ADMIN or the user themselves can make changes.
    if (user.selfRegistered && user.id !== requestingUser.sub && !IS_ADMIN(requestingUser)) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    // Check email uniqueness if changing email
    if (dto.email !== undefined) {
      await this.ensureEmailUnique(dto.email, user.id);
    }

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.status !== undefined) data.status = dto.status;

    // PLATFORM_ADMIN can change profileId; BASIC_USER cannot
    if (IS_ADMIN(requestingUser) && dto.profileId !== undefined) {
      data.profileId = await this.resolveRelation('profile', dto.profileId, 'Profile');
    }

    // Allow explicit null to clear optional relations
    if ('userTypeId' in dto) {
      data.userTypeId = dto.userTypeId
        ? await this.resolveRelation('userType', dto.userTypeId, 'UserType')
        : null;
    }
    if ('levelId' in dto) {
      data.levelId = dto.levelId
        ? await this.resolveRelation('userLevel', dto.levelId, 'UserLevel')
        : null;
    }

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if ('timezone' in dto) {
      data.timezone = dto.timezone ?? null;
    }

    if ('phone'   in dto) data.phone   = (dto as any).phone   ?? null;
    if ('website' in dto) data.website = (dto as any).website ?? null;
    if ('address' in dto) data.address = (dto as any).address ?? null;

    return this.prisma.user.update({
      where: { id: user.id },
      data,
      select: USER_SELECT,
    });
  }

  /**
   * Endpoint dedicado para o próprio user actualizar a sua timezone (sem
   * passar por @Patch(':id') que tem checks de ownership/admin).
   *
   * Usado por:
   * - Detecção do browser na primeira sessão (AppLayout fire-and-forget).
   * - Aba "Região e Idioma" da UserSettingsPage.
   */
  async updateMyTimezone(userId: number, timezone: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { timezone },
      select: USER_SELECT,
    });
  }

  /**
   * Endpoint dedicado para o próprio user actualizar o perfil (name, phone,
   * website, address) sem passar pelos checks de ownership do PATCH :id.
   */
  async updateMyProfile(userId: number, dto: import('./dto/update-my-profile.dto').UpdateMyProfileDto) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if ('phone'   in dto) data.phone   = dto.phone   ?? null;
    if ('website' in dto) data.website = dto.website ?? null;
    if ('address' in dto) data.address = dto.address ?? null;

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });
  }

  /**
   * Endpoint dedicado para o próprio user alterar a sua password.
   * Valida a password actual via bcrypt.compare antes de actualizar.
   */
  async updateMyPassword(userId: number, dto: import('./dto/update-my-password.dto').UpdateMyPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new AppException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new AppException('INVALID_CURRENT_PASSWORD', HttpStatus.BAD_REQUEST);

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: USER_SELECT,
    });
  }

  /**
   * Endpoint dedicado para o próprio user actualizar o seu locale.
   *
   * Aceita `null` para "limpar" (volta à detecção do browser).
   * Para um valor não-null, valida que existe na tabela `Locale` e está
   * activo — caso contrário devolve null (defensivo: input inválido =
   * cair no fallback do frontend).
   *
   * Usado por:
   * - LanguageSelector no header (quando user autenticado).
   * - Aba "Região e Idioma" da UserSettingsPage.
   * - AppLayout sync effect na primeira sessão (BD null + i18next resolved).
   */
  async updateMyLocale(userId: number, locale: string | null) {
    let resolved: string | null = null;
    if (locale) {
      const found = await this.prisma.locale.findFirst({
        where: { code: locale, isActive: true },
        select: { code: true },
      });
      if (!found) {
        throw new AppException('LOCALE_NOT_SUPPORTED', HttpStatus.BAD_REQUEST);
      }
      resolved = found.code;
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { locale: resolved },
      select: USER_SELECT,
    });
  }

  /** Soft delete — sets status to INACTIVE */
  async remove(publicId: string, requestingUser: JwtPayload) {
    const user = await this.resolveUser(publicId);
    this.assertOwnership(user.id, user.createdById, requestingUser);

    return this.prisma.user.update({
      where: { id: user.id },
      data: { status: Status.INACTIVE },
      select: USER_SELECT,
    });
  }

  // ── Auth helpers ─────────────────────────────────────────────────────────

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });
  }

  /** Assign the default plan to a newly created user */
  private async assignDefaultPlan(userId: number) {
    const defaultPlan = await this.prisma.plan.findFirst({
      where: { isDefault: true, planStatus: 'ACTIVE' },
    });
    if (!defaultPlan) return;

    await this.prisma.userPlan.create({
      data: { userId, planId: defaultPlan.id, isActive: true },
    });
  }

  /** Returns user with passwordHash + selfRegistered for credential validation and registration flow */
  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        ...USER_SELECT,
        id: true,
        passwordHash: true,
        selfRegistered: true,
      },
    });
  }

  /** Activate an invited (non-selfRegistered) user when they complete self-registration.
   *  Updates name, passwordHash and marks selfRegistered = true. Returns USER_SELECT + id. */
  async activateInvitedUser(userId: number, data: { name: string; passwordHash: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        passwordHash: data.passwordHash,
        selfRegistered: true,
        status: Status.ACTIVE,
      },
      select: { ...USER_SELECT, id: true },
    });
  }
}
