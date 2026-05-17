import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { EmailTokenService } from '../auth/email-token.service';
import { EmailService } from '../emails/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
import { SetWorkspaceMemberProjectsDto } from './dto/set-projects.dto';
import { LimitKey } from '../common/entitlements';

const INVITE_TOKEN_MS = 72 * 60 * 60_000;

@Injectable()
export class WorkspaceMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailTokens: EmailTokenService,
    private readonly emailService: EmailService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Resolve o workspaceId default do owner (V2: mais antigo de N possíveis). */
  private async resolveOwnerWorkspaceId(ownerId: number): Promise<number> {
    const ws = await this.prisma.workspace.findFirst({
      where: { ownerId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!ws) {
      throw new AppException('WORKSPACE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return ws.id;
  }

  // ── Listing ──────────────────────────────────────────────────────────────

  async listMembers(ownerId: number) {
    const workspaceId = await this.resolveOwnerWorkspaceId(ownerId);
    const rows = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: [{ memberType: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { publicId: true, name: true, email: true, avatarKey: true } },
        userType: { select: { publicId: true, code: true, label: true, isSystem: true } },
      },
    });
    // Count projects per member (real ProjectMember rows in owner's projects)
    const ownerProjectIds = (
      await this.prisma.project.findMany({
        where: { ownerId, status: 'ACTIVE' },
        select: { id: true },
      })
    ).map((p) => p.id);
    const projectCounts = new Map<string, number>();
    if (ownerProjectIds.length > 0) {
      const grouped = await this.prisma.projectMember.groupBy({
        by: ['email'],
        where: { projectId: { in: ownerProjectIds }, email: { in: rows.map((r) => r.email) } },
        _count: { email: true },
      });
      for (const g of grouped) projectCounts.set(g.email, g._count.email);
    }
    return rows.map((r) => this.toPublic(r, projectCounts.get(r.email) ?? 0));
  }

  async listSeatsSummary(ownerId: number) {
    const workspaceId = await this.resolveOwnerWorkspaceId(ownerId);
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: { select: { publicId: true, code: true, name: true, limits: true } } },
    });
    if (!sub) {
      return { used: 0, total: 0, plan: null };
    }
    const seatLimit = sub.plan.limits.find((l) => l.limitKey === LimitKey.MAX_LICENSED_SEATS);
    const base = seatLimit?.limitValue ?? 0;
    const total = base < 0 ? -1 : base + sub.extraSeats;
    const used = await this.prisma.workspaceMember.count({
      where: { workspaceId, memberType: 'LICENSED', status: 'ACCEPTED' },
    });
    return {
      used,
      total,
      base,
      extraSeats: sub.extraSeats,
      plan: { publicId: sub.plan.publicId, code: sub.plan.code, name: sub.plan.name },
    };
  }

  // ── Invite ───────────────────────────────────────────────────────────────

  async inviteMember(ownerId: number, dto: InviteWorkspaceMemberDto) {
    const workspaceId = await this.resolveOwnerWorkspaceId(ownerId);

    if (dto.memberType === 'LICENSED') {
      await this.assertCanLicense(ownerId);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, name: true, email: true, locale: true },
    });

    // Owner cannot invite themselves
    if (existingUser?.id === ownerId) {
      throw new AppException('CANNOT_INVITE_SELF', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_email: { workspaceId, email: dto.email } },
    });
    if (existing && existing.status === 'ACCEPTED') {
      throw new AppException('ALREADY_MEMBER', HttpStatus.CONFLICT);
    }

    // Resolve UserType (workspace-scoped or platform-level). Only used if
    // `projects` is non-empty — guarded but resolved upfront so a bad
    // publicId fails fast before any write.
    let userTypeId: number | null = null;
    if (dto.userTypePublicId) {
      const ut = await this.prisma.userType.findUnique({
        where: { publicId: dto.userTypePublicId },
        select: { id: true, workspaceId: true },
      });
      if (!ut || (ut.workspaceId !== null && ut.workspaceId !== workspaceId)) {
        throw new AppException('USER_TYPE_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      userTypeId = ut.id;
    }

    // Resolve projects (must belong to ownerId's workspace). Atomic with the
    // workspace upsert below.
    const projectAssignments = dto.projects ?? [];
    const projectsById = new Map<string, { id: number; publicId: string }>();
    if (projectAssignments.length > 0) {
      const rows = await this.prisma.project.findMany({
        where: {
          publicId: { in: projectAssignments.map((p) => p.projectPublicId) },
          workspaceId,
          status: 'ACTIVE',
        },
        select: { id: true, publicId: true },
      });
      for (const r of rows) projectsById.set(r.publicId, r);
      for (const a of projectAssignments) {
        if (!projectsById.has(a.projectPublicId)) {
          throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
        }
      }
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.workspaceMember.upsert({
        where: { workspaceId_email: { workspaceId, email: dto.email } },
        create: {
          workspaceId,
          userId: existingUser?.id ?? null,
          email: dto.email,
          name: dto.name ?? existingUser?.name ?? null,
          memberType: dto.memberType ?? 'BASIC',
          userTypeId,
          status: 'INVITED',
          invitedById: ownerId,
        },
        update: {
          userId: existingUser?.id ?? undefined,
          name: dto.name ?? existingUser?.name ?? undefined,
          memberType: dto.memberType ?? undefined,
          userTypeId: dto.userTypePublicId !== undefined ? userTypeId : undefined,
          status: 'INVITED',
          acceptedAt: null,
          declinedAt: null,
          invitedById: ownerId,
        },
      });

      // For each selected project: upsert ProjectMember on (projectId, email).
      // Skip rows already ACCEPTED — don't downgrade an existing membership.
      for (const a of projectAssignments) {
        const proj = projectsById.get(a.projectPublicId)!;
        const existingPm = await tx.projectMember.findUnique({
          where: { projectId_email: { projectId: proj.id, email: dto.email } },
          select: { id: true, status: true },
        });
        if (existingPm?.status === 'ACCEPTED') continue;

        await tx.projectMember.upsert({
          where: { projectId_email: { projectId: proj.id, email: dto.email } },
          create: {
            projectId: proj.id,
            userId: existingUser?.id ?? null,
            email: dto.email,
            name: dto.name ?? existingUser?.name ?? null,
            role: a.role,
            status: 'INVITED',
            userTypeId,
            invitedById: ownerId,
          },
          update: {
            userId: existingUser?.id ?? undefined,
            name: dto.name ?? existingUser?.name ?? undefined,
            role: a.role,
            status: 'INVITED',
            userTypeId,
            invitedById: ownerId,
          },
        });
      }

      return upserted;
    });

    await this.sendInvite(member.id, ownerId, existingUser);
    return this.getById(member.id);
  }

  async resendInvite(ownerId: number, publicId: string) {
    const member = await this.findOwnedMember(ownerId, publicId);
    if (member.status === 'ACCEPTED') {
      throw new AppException('ALREADY_ACCEPTED', HttpStatus.CONFLICT);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: member.email },
      select: { id: true, name: true, email: true, locale: true },
    });

    await this.prisma.workspaceMember.update({
      where: { id: member.id },
      data: { status: 'INVITED', declinedAt: null },
    });

    await this.sendInvite(member.id, ownerId, existingUser);
    return this.getById(member.id);
  }

  private async sendInvite(
    memberId: number,
    ownerId: number,
    existingUser: { id: number; name: string; email: string; locale: string | null } | null,
  ) {
    const member = await this.prisma.workspaceMember.findUniqueOrThrow({
      where: { id: memberId },
    });
    const owner = await this.prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: { name: true, email: true },
    });

    const token = await this.emailTokens.createToken(TokenType.ACCOUNT_INVITE, {
      userId: existingUser?.id,
      email: existingUser ? undefined : member.email,
      expiresInMs: INVITE_TOKEN_MS,
    });
    const recipientLocale = existingUser?.locale ?? 'pt-PT';
    const inviteUrl = `${this.emailService.appUrl}/${recipientLocale.toLowerCase()}/create-account?token=${token}`;

    if (existingUser) {
      // Notify in-app + email via NotificationsService.
      this.notifications
        .createInvitationReceivedNotification(
          existingUser.id,
          owner.name,
          'Workspace',
          member.publicId, // projectPublicId placeholder — workspace has no project
          member.publicId, // invitationPublicId
          inviteUrl,
        )
        .catch(() => {});
    } else {
      // New email — send direct (no in-app notification possible)
      this.emailService
        .sendInvitationReceivedEmail({
          recipientEmail: member.email,
          recipientName: member.name ?? member.email,
          inviterName: owner.name,
          projectName: 'Workspace',
          inviteUrl,
          locale: null,
        })
        .catch(() => {});
    }
  }

  // ── Member type (BASIC ↔ LICENSED) + UserType ────────────────────────────

  async updateMemberType(ownerId: number, publicId: string, dto: UpdateWorkspaceMemberDto) {
    const member = await this.findOwnedMember(ownerId, publicId);
    const workspaceId = member.workspaceId;

    const data: { memberType?: 'BASIC' | 'LICENSED'; userTypeId?: number | null } = {};

    if (dto.memberType !== undefined && member.memberType !== dto.memberType) {
      if (dto.memberType === 'LICENSED') {
        await this.assertCanLicense(ownerId);
      }
      data.memberType = dto.memberType;
    }

    if (dto.userTypePublicId !== undefined) {
      if (dto.userTypePublicId === null) {
        data.userTypeId = null;
      } else {
        const ut = await this.prisma.userType.findUnique({
          where: { publicId: dto.userTypePublicId },
          select: { id: true, workspaceId: true },
        });
        if (!ut || (ut.workspaceId !== null && ut.workspaceId !== workspaceId)) {
          throw new AppException('USER_TYPE_NOT_FOUND', HttpStatus.NOT_FOUND);
        }
        data.userTypeId = ut.id;
      }
    }

    if (Object.keys(data).length === 0) return this.getById(member.id);

    await this.prisma.workspaceMember.update({
      where: { id: member.id },
      data,
    });
    return this.getById(member.id);
  }

  // ── Remove ───────────────────────────────────────────────────────────────

  async removeMember(ownerId: number, publicId: string) {
    const member = await this.findOwnedMember(ownerId, publicId);

    await this.prisma.$transaction(async (tx) => {
      // Cascade: remove ProjectMember rows in owner's projects
      if (member.userId) {
        const ownerProjects = await tx.project.findMany({
          where: { ownerId, status: 'ACTIVE' },
          select: { id: true },
        });
        await tx.projectMember.deleteMany({
          where: {
            userId: member.userId,
            projectId: { in: ownerProjects.map((p) => p.id) },
          },
        });
      }
      await tx.workspaceMember.delete({ where: { id: member.id } });
    });

    return { deleted: publicId };
  }

  // ── Project assignments ──────────────────────────────────────────────────

  async getMemberProjects(ownerId: number, publicId: string) {
    const member = await this.findOwnedMember(ownerId, publicId);
    const ownerProjects = await this.prisma.project.findMany({
      where: { ownerId, status: 'ACTIVE' },
      select: {
        publicId: true,
        name: true,
        members: {
          where: member.userId ? { userId: member.userId } : { email: member.email },
          select: { role: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return ownerProjects.map((p) => ({
      publicId: p.publicId,
      name: p.name,
      assigned: p.members.length > 0,
      role: (p.members[0]?.role ?? null) as 'OWNER' | 'CONTRIBUTOR' | 'READER' | null,
      status: p.members[0]?.status ?? null,
    }));
  }

  async setMemberProjects(
    ownerId: number,
    publicId: string,
    dto: SetWorkspaceMemberProjectsDto,
  ) {
    const member = await this.findOwnedMember(ownerId, publicId);
    if (!member.userId) {
      throw new AppException('MEMBER_NOT_REGISTERED', HttpStatus.BAD_REQUEST);
    }

    const ownerProjects = await this.prisma.project.findMany({
      where: { ownerId, status: 'ACTIVE' },
      select: { id: true, publicId: true },
    });
    const projectMap = new Map(ownerProjects.map((p) => [p.publicId, p.id]));

    // Validate all assignments belong to this owner
    for (const a of dto.assignments) {
      if (!projectMap.has(a.projectPublicId)) {
        throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
    }

    const targetIds = new Set(dto.assignments.map((a) => projectMap.get(a.projectPublicId)!));

    await this.prisma.$transaction(async (tx) => {
      // Remove unselected projects
      const toRemove = ownerProjects.filter((p) => !targetIds.has(p.id)).map((p) => p.id);
      if (toRemove.length > 0) {
        await tx.projectMember.deleteMany({
          where: {
            userId: member.userId!,
            projectId: { in: toRemove },
          },
        });
      }

      // Upsert selected projects
      for (const a of dto.assignments) {
        const projectId = projectMap.get(a.projectPublicId)!;
        await tx.projectMember.upsert({
          where: { projectId_email: { projectId, email: member.email } },
          create: {
            projectId,
            userId: member.userId!,
            email: member.email,
            name: member.name,
            role: a.role,
            status: 'ACCEPTED',
            invitedById: ownerId,
          },
          update: {
            role: a.role,
            userId: member.userId!,
            status: 'ACCEPTED',
          },
        });
      }
    });

    return this.getMemberProjects(ownerId, publicId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Lança SEAT_LIMIT_REACHED se já não houver seats LICENSED disponíveis.
   * Resolve plano via Subscription do workspace; usa `max_licensed_seats` + extraSeats.
   */
  private async assertCanLicense(ownerId: number) {
    const summary = await this.listSeatsSummary(ownerId);
    if (summary.total === -1) return; // unlimited
    if (summary.used >= summary.total) {
      throw new HttpException(
        {
          error_code: 'SEAT_LIMIT_REACHED',
          statusCode: HttpStatus.CONFLICT,
          used: summary.used,
          total: summary.total,
        },
        HttpStatus.CONFLICT,
      );
    }
  }

  private async findOwnedMember(ownerId: number, publicId: string) {
    const workspaceId = await this.resolveOwnerWorkspaceId(ownerId);
    const member = await this.prisma.workspaceMember.findUnique({ where: { publicId } });
    if (!member || member.workspaceId !== workspaceId) {
      throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return member;
  }

  private async getById(id: number) {
    const row = await this.prisma.workspaceMember.findUniqueOrThrow({
      where: { id },
      include: {
        user: { select: { publicId: true, name: true, email: true, avatarKey: true } },
        userType: { select: { publicId: true, code: true, label: true, isSystem: true } },
      },
    });
    return this.toPublic(row);
  }

  private toPublic(
    row: {
      publicId: string;
      email: string;
      name: string | null;
      memberType: 'BASIC' | 'LICENSED';
      status: 'INVITED' | 'ACCEPTED' | 'DECLINED';
      acceptedAt: Date | null;
      declinedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      user: { publicId: string; name: string; email: string; avatarKey: string | null } | null;
      userType?: { publicId: string; code: string; label: string; isSystem: boolean } | null;
    },
    projectCount?: number,
  ) {
    return {
      publicId: row.publicId,
      email: row.email,
      name: row.name,
      memberType: row.memberType,
      status: row.status,
      acceptedAt: row.acceptedAt,
      declinedAt: row.declinedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.user
        ? {
            publicId: row.user.publicId,
            name: row.user.name,
            email: row.user.email,
            avatarKey: row.user.avatarKey,
          }
        : null,
      // System types (e.g., "Sem Tipo") são detalhes internos — escondidos
      // do frontend. Membros com type system aparecem como "sem tipo" na UI.
      userType: row.userType && !row.userType.isSystem
        ? { publicId: row.userType.publicId, code: row.userType.code, label: row.userType.label }
        : null,
      ...(typeof projectCount === 'number' ? { projectCount } : {}),
    };
  }
}
