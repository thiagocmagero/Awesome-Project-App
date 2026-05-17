import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { InviteStatus, Prisma, ProjectRole, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddTeamDto } from './dto/add-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UsageService } from '../usage/usage.service';
import { HolidaysService } from '../holidays/holidays.service';
import { AddHolidayDto } from './dto/add-holiday.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailTokenService } from '../auth/email-token.service';
import { EmailService } from '../emails/email.service';
import { TokenType } from '@prisma/client';
import { LimitKey } from '../common/entitlements';

/** User fields included in owner/manager relations */
const USER_BRIEF = {
  select: {
    publicId: true,
    name: true,
    email: true,
    status: true,
    profile: { select: { code: true, label: true } },
    userType: { select: { code: true, label: true } },
  },
} as const;

/** Full project include — owner, manager, teams with members (for planning resources) */
const PROJECT_INCLUDE = {
  owner: USER_BRIEF,
  manager: USER_BRIEF,
  teams: {
    include: {
      team: {
        select: {
          publicId: true,
          name: true,
          description: true,
          status: true,
          _count: { select: { members: true } },
          members: {
            select: {
              publicId: true,
              isLead: true,
              user: {
                select: {
                  publicId: true, name: true, email: true, status: true,
                  userType: { select: { publicId: true, code: true, label: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

const IS_ADMIN = (u: JwtPayload) => u.profileCode === 'PLATFORM_ADMIN';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
    private readonly holidaysService: HolidaysService,
    private readonly notificationsService: NotificationsService,
    private readonly emailTokens: EmailTokenService,
    private readonly emailService: EmailService,
  ) {}

  // ── Helper: resolve publicId → internal numeric id ──────────────────────────

  private async resolveProjectId(publicId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
    return project.id;
  }

  private async resolveUserId(publicId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!user) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return user.id;
  }

  private async resolveTeamId(publicId: string): Promise<number> {
    const team = await this.prisma.team.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!team) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return team.id;
  }

  private async resolveMemberId(publicId: string): Promise<number> {
    const member = await this.prisma.projectMember.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!member) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return member.id;
  }

  // ── Projects CRUD ───────────────────────────────────────────────────────────

  async findAll(requestingUser: JwtPayload) {
    const where = IS_ADMIN(requestingUser)
      ? { status: { not: Status.ARCHIVED } }
      : {
          status: { not: Status.ARCHIVED },
          OR: [
            { ownerId: requestingUser.sub },
            { members: { some: { userId: requestingUser.sub, status: InviteStatus.ACCEPTED } } },
            { teams: { some: { team: { status: Status.ACTIVE, members: { some: { userId: requestingUser.sub } } } } } },
          ],
        };

    return this.prisma.project.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        publicId: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        priority: true,
        dateFormat: true,
        workHours: true,
        createdAt: true,
        updatedAt: true,
        ...PROJECT_INCLUDE,
      },
    });
  }

  async findOne(publicId: string, requestingUser: JwtPayload) {
    const project = await this.prisma.project.findUnique({
      where: { publicId },
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        status: true,
        ownerId: true,
        startDate: true,
        endDate: true,
        priority: true,
        dateFormat: true,
        workHours: true,
        createdAt: true,
        updatedAt: true,
        ...PROJECT_INCLUDE,
      },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);

    if (!IS_ADMIN(requestingUser) && project.ownerId !== requestingUser.sub) {
      // Check direct membership or team-based access
      const membership = await this.prisma.projectMember.findFirst({
        where: { projectId: project.id, userId: requestingUser.sub, status: InviteStatus.ACCEPTED },
        select: { id: true },
      });
      if (!membership) {
        const teamAccess = await this.prisma.teamMember.findFirst({
          where: { userId: requestingUser.sub, team: { status: Status.ACTIVE, projects: { some: { projectId: project.id } } } },
          select: { userId: true },
        });
        if (!teamAccess) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
      }
    }

    // Strip internal id before returning, keep ownerId check internal
    const { id: _id, ownerId: _ownerId, ...result } = project;
    return result;
  }

  /**
   * Internal findOne that returns the internal id for use by other service methods.
   * Validates that the user is admin, owner, or an accepted project member.
   * Fine-grained permission checks are handled by ProjectPermissionGuard.
   */
  private async findOneInternal(publicId: string, requestingUser: JwtPayload) {
    const project = await this.prisma.project.findUnique({
      where: { publicId },
      select: { id: true, ownerId: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);

    if (!IS_ADMIN(requestingUser) && project.ownerId !== requestingUser.sub) {
      // Check direct project membership
      const membership = await this.prisma.projectMember.findFirst({
        where: { projectId: project.id, userId: requestingUser.sub, status: InviteStatus.ACCEPTED },
        select: { id: true },
      });
      if (!membership) {
        // Check team-based access — user is in a team associated with the project
        const teamAccess = await this.prisma.teamMember.findFirst({
          where: {
            userId: requestingUser.sub,
            team: { status: Status.ACTIVE, projects: { some: { projectId: project.id } } },
          },
          select: { userId: true },
        });
        if (!teamAccess) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
      }
    }

    return project;
  }

  async create(dto: CreateProjectDto, requestingUser: JwtPayload) {
    const ownerNumericId = requestingUser.sub;

    // Resolve publicId → numeric id for manager
    const managerNumericId = dto.managerId
      ? await this.resolveUserId(dto.managerId)
      : null;

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: ownerNumericId,
        managerId: managerNumericId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        priority: dto.priority ?? null,
        dateFormat: dto.dateFormat ?? null,
        workHours: dto.workHours ?? undefined,
      },
      select: {
        publicId: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        priority: true,
        dateFormat: true,
        workHours: true,
        createdAt: true,
        updatedAt: true,
        ...PROJECT_INCLUDE,
      },
    });

    await this.usageService.increment(requestingUser.sub, LimitKey.MAX_PROJECTS);
    return project;
  }

  async update(publicId: string, dto: UpdateProjectDto, requestingUser: JwtPayload) {
    const { id: projectId } = await this.findOneInternal(publicId, requestingUser);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined)        data.name        = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined)      data.status      = dto.status;

    if ('managerId' in dto) {
      data.managerId = dto.managerId ? await this.resolveUserId(dto.managerId) : null;
    }
    if ('startDate' in dto) data.startDate = dto.startDate ? new Date(dto.startDate as string) : null;
    if ('endDate' in dto) data.endDate = dto.endDate ? new Date(dto.endDate as string) : null;
    if ('priority' in dto) data.priority = dto.priority ?? null;
    if ('dateFormat' in dto) data.dateFormat = dto.dateFormat ?? null;
    if ('workHours' in dto) data.workHours = dto.workHours ?? null;

    return this.prisma.project.update({
      where: { id: projectId },
      data,
      select: {
        publicId: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        priority: true,
        dateFormat: true,
        workHours: true,
        createdAt: true,
        updatedAt: true,
        ...PROJECT_INCLUDE,
      },
    });
  }

  /** Soft delete — sets status to INACTIVE */
  async remove(publicId: string, requestingUser: JwtPayload) {
    const { id: projectId } = await this.findOneInternal(publicId, requestingUser);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: Status.INACTIVE },
      select: {
        publicId: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        priority: true,
        dateFormat: true,
        workHours: true,
        createdAt: true,
        updatedAt: true,
        ...PROJECT_INCLUDE,
      },
    });

    await this.usageService.decrement(requestingUser.sub, LimitKey.MAX_PROJECTS);
    return project;
  }

  // ── Team associations ───────────────────────────────────────────────────────

  async addTeam(projectPublicId: string, dto: AddTeamDto, requestingUser: JwtPayload) {
    const { id: projectId } = await this.findOneInternal(projectPublicId, requestingUser);

    const teamId = await this.resolveTeamId(dto.teamId);

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });
    if (!team) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    // BASIC_USER can only associate their own teams
    if (!IS_ADMIN(requestingUser) && team.ownerId !== requestingUser.sub) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    const existing = await this.prisma.projectTeam.findUnique({
      where: { projectId_teamId: { projectId, teamId } },
    });
    if (existing) throw new AppException('TEAM_ALREADY_IN_PROJECT', HttpStatus.CONFLICT);

    await this.prisma.projectTeam.create({
      data: { projectId, teamId },
    });

    return this.findOne(projectPublicId, requestingUser);
  }

  async removeTeam(projectPublicId: string, teamPublicId: string, requestingUser: JwtPayload) {
    const { id: projectId } = await this.findOneInternal(projectPublicId, requestingUser);
    const teamId = await this.resolveTeamId(teamPublicId);

    const assoc = await this.prisma.projectTeam.findUnique({
      where: { projectId_teamId: { projectId, teamId } },
    });
    if (!assoc) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    // Snapshot the team's members BEFORE breaking the ProjectTeam link —
    // the helper queries the same ProjectTeam table to find affected projects.
    const memberUserIds = (
      await this.prisma.teamMember.findMany({
        where: { teamId },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.projectTeam.delete({
        where: { projectId_teamId: { projectId, teamId } },
      });
      // Reconcile ProjectMember rows that joined THIS project via the team
      // we just unlinked. Other projects this team is still linked to are
      // not affected — only this projectId matters here, but the helper
      // iterates by ProjectTeam links which now exclude us, so we run a
      // scoped reconciliation manually.
      await this.reconcileProjectMembershipsForUnlinkedTeam(
        tx,
        projectId,
        teamId,
        memberUserIds,
      );
    });

    return this.findOne(projectPublicId, requestingUser);
  }

  /**
   * Variant of TeamsService.reconcileProjectMembershipsForTeam scoped to a
   * single project, used when a ProjectTeam link is removed (the team still
   * exists and may be linked to other projects). The semantics mirror the
   * generic helper: only touches ProjectMember rows where teamId === teamId,
   * and tries to re-point or delete based on owner/manager and remaining
   * team memberships.
   */
  private async reconcileProjectMembershipsForUnlinkedTeam(
    tx: Prisma.TransactionClient,
    projectId: number,
    teamId: number,
    affectedUserIds: number[],
  ): Promise<void> {
    if (affectedUserIds.length === 0) return;

    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, managerId: true },
    });
    if (!project) return;

    const memberships = await tx.projectMember.findMany({
      where: {
        projectId,
        userId: { in: affectedUserIds },
        teamId,
      },
      select: { id: true, userId: true },
    });

    for (const pm of memberships) {
      if (pm.userId === null) continue;

      if (project.ownerId === pm.userId || project.managerId === pm.userId) {
        await tx.projectMember.update({ where: { id: pm.id }, data: { teamId: null } });
        continue;
      }

      const fallback = await tx.teamMember.findFirst({
        where: {
          userId: pm.userId,
          teamId: { not: teamId },
          team: {
            status: Status.ACTIVE,
            projects: { some: { projectId } },
          },
        },
        select: { teamId: true },
      });

      if (fallback) {
        await tx.projectMember.update({
          where: { id: pm.id },
          data: { teamId: fallback.teamId },
        });
      } else {
        await tx.projectMember.delete({ where: { id: pm.id } });
      }
    }
  }

  // ── Project members (invitations) ───────────────────────────────────────────

  private readonly MEMBER_INCLUDE = {
    user: {
      select: { publicId: true, name: true, email: true, status: true },
    },
    invitedBy: {
      select: { publicId: true, name: true, email: true },
    },
  } as const;

  private readonly MEMBER_SELECT = {
    publicId: true,
    email: true,
    name: true,
    role: true,
    status: true,
    teamId: true,
    team: { select: { publicId: true, name: true } },
    createdAt: true,
    updatedAt: true,
    user: {
      select: { publicId: true, name: true, email: true, status: true },
    },
    invitedBy: {
      select: { publicId: true, name: true, email: true },
    },
  } as const;

  async listMembers(projectPublicId: string, requestingUser: JwtPayload) {
    const { id: projectId } = await this.findOneInternal(projectPublicId, requestingUser);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      select: this.MEMBER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(projectPublicId: string, dto: InviteMemberDto, requestingUser: JwtPayload) {
    const { id: projectId } = await this.findOneInternal(projectPublicId, requestingUser);

    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_email: { projectId, email } },
    });
    if (existing) throw new AppException('INVITATION_ALREADY_EXISTS', HttpStatus.CONFLICT);

    // Resolve optional teamId and validate it belongs to this project
    let teamNumericId: number | null = null;
    if (dto.teamId) {
      teamNumericId = await this.resolveTeamId(dto.teamId);
      const projectTeam = await this.prisma.projectTeam.findFirst({
        where: { projectId, teamId: teamNumericId },
        select: { id: true },
      });
      if (!projectTeam) {
        throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
      }
    }

    // Check if the invited email belongs to an existing platform user
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, locale: true },
    });

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        email,
        name: dto.name?.trim() || null,
        userId: existingUser?.id ?? null,
        role: dto.role ?? ProjectRole.READER,
        invitedById: requestingUser.sub,
        teamId: teamNumericId,
      },
      include: {
        user: { select: { publicId: true, name: true, email: true, status: true } },
        invitedBy: { select: { publicId: true, name: true, email: true } },
        team: { select: { publicId: true, name: true } },
        project: { select: { publicId: true, name: true } },
      },
    });

    // Create ACCOUNT_INVITE token (72h) for the invite link
    const INVITE_TOKEN_MS = 72 * 60 * 60_000;
    const inviteToken = await this.emailTokens.createToken(TokenType.ACCOUNT_INVITE, {
      userId: existingUser?.id ?? undefined,
      email: existingUser ? undefined : email,
      expiresInMs: INVITE_TOKEN_MS,
    });
    // Locale do convidado (preferência) ou fallback pt-PT — coerência entre
    // email e landing page após click no convite.
    const recipientLocale = existingUser?.locale ?? 'pt-PT';
    const inviteUrl = `${this.emailService.appUrl}/${recipientLocale.toLowerCase()}/create-account?token=${inviteToken}`;

    // Fallback "Sistema" para o inviter caso tenha sido removido (FK SetNull).
    const inviterName = member.invitedBy?.name ?? 'Sistema';
    if (existingUser) {
      // Existing user: in-app notification + email (via notification fan-out)
      this.notificationsService.createInvitationReceivedNotification(
        existingUser.id,
        inviterName,
        member.project.name,
        member.project.publicId,
        member.publicId,
        inviteUrl,
      ).catch(() => {});
    } else {
      // New user: send invite email directly (no in-app notification without an account)
      this.emailService.sendInvitationReceivedEmail({
        recipientEmail: email,
        recipientName: dto.name ?? email,
        inviterName,
        projectName: member.project.name,
        inviteUrl,
        locale: null,
      }).catch(() => {});
    }

    // Strip internal fields from response
    const { id: _id, projectId: _pid, userId: _uid, invitedById: _iid, teamId: _tid, project: _p, ...memberResult } = member;
    return memberResult;
  }

  async updateMember(
    projectPublicId: string,
    memberPublicId: string,
    dto: UpdateMemberDto,
    requestingUser: JwtPayload,
  ) {
    const { id: projectId } = await this.findOneInternal(projectPublicId, requestingUser);
    const memberId = await this.resolveMemberId(memberPublicId);

    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!member) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: { ...(dto.role !== undefined && { role: dto.role }) },
      select: this.MEMBER_SELECT,
    });
  }

  async removeMember(projectPublicId: string, memberPublicId: string, requestingUser: JwtPayload) {
    const { id: projectId } = await this.findOneInternal(projectPublicId, requestingUser);
    const memberId = await this.resolveMemberId(memberPublicId);

    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!member) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    return this.prisma.projectMember.delete({
      where: { id: memberId },
      select: this.MEMBER_SELECT,
    });
  }

  // ── Holiday associations ─────────────────────────────────────────────────────

  private async resolveHolidayById(publicId: string): Promise<number> {
    const h = await this.prisma.holiday.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!h) throw new AppException('HOLIDAY_NOT_FOUND', HttpStatus.NOT_FOUND);
    return h.id;
  }

  async listProjectHolidays(projectPublicId: string) {
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);

    const rows = await this.prisma.projectHoliday.findMany({
      where: { projectId: project.id },
      include: {
        holiday: {
          include: { _count: { select: { dates: true } } },
        },
      },
      orderBy: { holiday: { name: 'asc' } },
    });

    return rows.map((r) => ({
      publicId: r.holiday.publicId,
      name: r.holiday.name,
      description: r.holiday.description,
      status: r.holiday.status,
      _count: r.holiday._count,
    }));
  }

  async addHolidayToProject(projectPublicId: string, dto: AddHolidayDto) {
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);

    const holidayId = await this.resolveHolidayById(dto.holidayId);

    try {
      await this.prisma.projectHoliday.create({
        data: { projectId: project.id, holidayId },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new AppException('MEMBER_ALREADY_EXISTS', HttpStatus.CONFLICT);
      }
      throw e;
    }

    return this.listProjectHolidays(projectPublicId);
  }

  async removeHolidayFromProject(projectPublicId: string, holidayPublicId: string) {
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);

    const holidayId = await this.resolveHolidayById(holidayPublicId);

    const row = await this.prisma.projectHoliday.findFirst({
      where: { projectId: project.id, holidayId },
    });
    if (!row) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    await this.prisma.projectHoliday.delete({ where: { id: row.id } });
    return { removed: holidayPublicId };
  }
}
