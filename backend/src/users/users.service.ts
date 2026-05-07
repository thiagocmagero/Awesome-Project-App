import {
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
// `sharp` exporta uma função directamente em CJS (`module.exports = sharp`).
// Sem `esModuleInterop: true` no tsconfig, `import sharp from 'sharp'` compila
// para `sharp_1.default(...)` e falha em runtime ("is not a function"). A
// sintaxe `import = require()` do TS mapeia 1:1 para `const sharp = require()`.
import sharp = require('sharp');
// `file-type@16.x` mantém CommonJS exports — versões 17+ são ESM-only e não
// resolvem com `moduleResolution: "node"` do tsconfig actual.
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { createDefaultBilling } from './billing-helpers';

// Fields included in every safe user response (never exposes passwordHash or internal IDs).
// Note: `avatarKey` é seleccionado mas NUNCA exposto — o helper `attachAvatarUrl`
// remove-o do response e injecta `avatarUrl` resolvido (URL pública completa).
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
  avatarKey: true,
  avatarUpdatedAt: true,
  profile: { select: { publicId: true, code: true, label: true } },
  userType: { select: { publicId: true, code: true, label: true } },
  level: { select: { publicId: true, code: true, label: true, order: true } },
  // Phase 7: subscription substitui userPlans como fonte de plano para o
  // payload do utilizador. UserPlan será removido na migration deste phase.
  subscription: {
    select: {
      status: true,
      plan: { select: { publicId: true, code: true, name: true } },
    },
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
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Converte `avatarKey` (path relativo no S3) em `avatarUrl` (URL pública
   * completa) e remove o campo interno `avatarKey` do response. **Sempre**
   * chamado antes de devolver um user pelo service — o frontend nunca recebe
   * `avatarKey`. Quando o storage está desactivado (env vars em falta) ou o
   * user não tem avatar, devolve `avatarUrl: null` (UI mostra iniciais).
   *
   * Generic preserva o tipo de input para que callers que dependem de campos
   * fortemente tipados (ex.: AuthService a aceder a `user.profile.code` após
   * `activateInvitedUser`) não percam type narrowing.
   */
  private attachAvatarUrl<T extends { avatarKey?: string | null }>(
    user: T,
  ): Omit<T, 'avatarKey'> & { avatarUrl: string | null };
  private attachAvatarUrl<T extends { avatarKey?: string | null }>(
    user: T | null,
  ): (Omit<T, 'avatarKey'> & { avatarUrl: string | null }) | null;
  private attachAvatarUrl<T extends { avatarKey?: string | null }>(
    user: T | null,
  ) {
    if (!user) return null;
    const { avatarKey, ...rest } = user;
    const avatarUrl =
      avatarKey && this.storage.isReady()
        ? this.storage.buildPublicUrl(avatarKey)
        : null;
    return { ...rest, avatarUrl };
  }

  /** Variante para arrays (findAll). */
  private attachAvatarUrlArray<T extends { avatarKey?: string | null }>(
    users: T[],
  ) {
    return users.map((u) => this.attachAvatarUrl(u));
  }

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
    const created = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(created);
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

    // Re-fetch to include the plan — also include internal id for AuthService.
    // O caller (AuthService) precisa do `id` interno; faz o pick necessário.
    const created = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { ...USER_SELECT, id: true },
    });
    return { ...this.attachAvatarUrl(created), id: created.id };
  }

  async findAll(requestingUser: JwtPayload, filters?: { status?: Status }) {
    // BASIC_USER sees: users they created + themselves (so they can add themselves to teams/projects)
    const ownershipFilter = IS_ADMIN(requestingUser)
      ? {}
      : { OR: [{ createdById: requestingUser.sub }, { id: requestingUser.sub }] };

    const statusFilter = filters?.status ? { status: filters.status } : {};

    const users = await this.prisma.user.findMany({
      where: { ...ownershipFilter, ...statusFilter },
      orderBy: { id: 'asc' },
      select: USER_SELECT,
    });
    return this.attachAvatarUrlArray(users);
  }

  async findOne(publicId: string, requestingUser: JwtPayload) {
    const user = await this.resolveUser(publicId);
    this.assertOwnership(user.id, user.createdById, requestingUser);
    return this.attachAvatarUrl(this.stripInternal(user));
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

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(updated);
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
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { timezone },
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(updated);
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

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(updated);
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
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(updated);
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
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { locale: resolved },
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(updated);
  }

  // ── Avatar (próprio user) ───────────────────────────────────────────────

  /**
   * Upload de avatar do próprio user. Pipeline:
   *   1. Validação de tamanho (já filtrado pelo Multer; defesa extra aqui).
   *   2. Detecção MIME real via magic bytes (`file-type`) — nunca confiar
   *      no Content-Type declarado pelo cliente. SVG é rejeitado por XSS.
   *   3. Reprocessamento via `sharp` — strip metadata + resize cover 256×256
   *      + WebP quality 85. O re-encode anula qualquer payload malicioso
   *      embebido (EXIF, comentários, polyglots).
   *   4. PUT no bucket público `avatars/{user.publicId}.webp`.
   *   5. Update `User.avatarKey` + `avatarUpdatedAt`.
   *
   * Errors:
   *   - 400 `AVATAR_TOO_LARGE` — file > 5 MB
   *   - 400 `AVATAR_INVALID_TYPE` — MIME real não está em allowed list
   *   - 400 `AVATAR_PROCESSING_FAILED` — sharp falhou (imagem corrompida)
   *   - 503 `STORAGE_NOT_READY` — env vars AWS_* em falta
   */
  async updateMyAvatar(userId: number, fileBuffer: Buffer) {
    if (fileBuffer.length > StorageService.maxAvatarBytes) {
      throw new AppException('AVATAR_TOO_LARGE', HttpStatus.BAD_REQUEST);
    }

    const detected = await fileTypeFromBuffer(fileBuffer);
    if (
      !detected ||
      !StorageService.allowedAvatarMime.includes(detected.mime)
    ) {
      throw new AppException('AVATAR_INVALID_TYPE', HttpStatus.BAD_REQUEST);
    }

    let processed: Buffer;
    try {
      processed = await sharp(fileBuffer)
        .rotate() // honra orientação EXIF antes de strip metadata
        .resize(256, 256, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (err) {
      this.logger.warn(`Sharp processing failed: ${(err as Error).message}`);
      throw new AppException(
        'AVATAR_PROCESSING_FAILED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { publicId: true },
    });
    if (!user) {
      throw new AppException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const key = await this.storage.putAvatar(user.publicId, processed);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarKey: key, avatarUpdatedAt: new Date() },
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(updated);
  }

  /**
   * Remove o avatar do próprio user. Apaga o objecto no S3 (silencioso em
   * caso de falha — não bloqueia a operação principal: o user fica logo
   * sem avatar na BD, e a falha vai para o log para diagnóstico). Limpa
   * `avatarKey` + `avatarUpdatedAt` no User.
   */
  async deleteMyAvatar(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true },
    });
    if (user?.avatarKey) {
      await this.storage.deletePublicObject(user.avatarKey).catch((e) =>
        this.logger.warn(
          `Avatar S3 delete failed (ignored): ${(e as Error).message}`,
        ),
      );
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarKey: null, avatarUpdatedAt: null },
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(updated);
  }

  /** Soft delete — sets status to INACTIVE */
  async remove(publicId: string, requestingUser: JwtPayload) {
    const user = await this.resolveUser(publicId);
    this.assertOwnership(user.id, user.createdById, requestingUser);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status: Status.INACTIVE },
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(updated);
  }

  /**
   * **Hard delete recursivo — apenas PLATFORM_ADMIN.**
   *
   * Apaga permanentemente o utilizador e tudo que lhe está associado:
   * - Personal data (sessions, notifications, prefs, subscription, invoices,
   *   timesheets próprias, comentários onde é mencionado/reagiu, etc.) →
   *   Cascade automático via FK `onDelete: Cascade`.
   * - Audit fields (createdBy, invitedBy, grantedBy, comment.author,
   *   approvedBy, rejectedBy, actor) → SetNull, preserva histórico.
   * - Owned entities (Project, Team, Holiday) → SetNull no `ownerId`,
   *   sysadmin pode reassignar. Workspace memberships do user são apagadas.
   * - Avatar S3 → eliminado após o DB delete confirmar.
   *
   * Para garantir que dados de novas funcionalidades futuras são considerados,
   * o schema impõe `onDelete` explícito em todas as FKs para User. Ver
   * docs/claude/db.md secção "User cascade rule".
   */
  async removeHard(publicId: string, requestingUser: JwtPayload) {
    if (requestingUser.profileCode !== 'PLATFORM_ADMIN') {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    const user = await this.resolveUser(publicId);

    // PLATFORM_ADMIN não se pode auto-apagar (deixaria a plataforma sem admin).
    if (user.id === requestingUser.sub) {
      throw new AppException('CANNOT_DELETE_SELF', HttpStatus.BAD_REQUEST);
    }

    // Resolver o avatar key ANTES do delete (depois deixa de existir).
    const avatarRow = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarKey: true },
    });
    const avatarKey = avatarRow?.avatarKey ?? null;

    // O cascade do Prisma trata de tudo o que tem FK para User. Se algum
    // novo modelo for adicionado sem onDelete explícito → este delete falha
    // com FK violation, alertando o developer (defesa contra "lixo desconhecido").
    await this.prisma.user.delete({ where: { id: user.id } });

    // S3 cleanup só depois do DB delete (best-effort; logar mas não falhar).
    if (avatarKey && this.storage.isReady()) {
      this.storage.deletePublicObject(avatarKey).catch((err) => {
        Logger.warn(
          `Avatar S3 delete falhou para utilizador ${user.publicId}: ${err}`,
          'UsersService',
        );
      });
    }

    return { deleted: publicId };
  }

  // ── Auth helpers ─────────────────────────────────────────────────────────

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: USER_SELECT,
    });
    return this.attachAvatarUrl(user);
  }

  /** Assign the default plan to a newly created user (dual-write UserPlan + Subscription).
   *  Phase 3 dual-write: ver `billing-helpers.ts`. */
  private async assignDefaultPlan(userId: number) {
    await createDefaultBilling(this.prisma, userId);
  }

  /** Returns user with passwordHash + selfRegistered for credential validation and registration flow.
   *  Caller (AuthService) consome `id`/`passwordHash`/`selfRegistered` directamente; ao devolver ao
   *  cliente, usa `attachAvatarUrl` no campo público. Aqui não transformamos para preservar `id`. */
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

  /** Helper exposto para AuthService: aplica `attachAvatarUrl` num user
   *  vindo de `findByEmailWithPassword`/`activateInvitedUser`/`createWithDefaultProfile`
   *  antes de o devolver na resposta de login/register. Mantém `id` intacto
   *  para que o caller possa usá-lo internamente; o caller pode dropá-lo
   *  ao construir o response. */
  toPublicResponse<T extends { avatarKey?: string | null }>(user: T) {
    return this.attachAvatarUrl(user);
  }

  /** Activate an invited (non-selfRegistered) user when they complete self-registration.
   *  Updates name, passwordHash and marks selfRegistered = true. Returns USER_SELECT + id. */
  async activateInvitedUser(userId: number, data: { name: string; passwordHash: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        passwordHash: data.passwordHash,
        selfRegistered: true,
        status: Status.ACTIVE,
      },
      select: { ...USER_SELECT, id: true },
    });
    return { ...this.attachAvatarUrl(updated), id: updated.id };
  }
}
