import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UsageService } from '../usage/usage.service';

/** Nested include shared by all team queries — includes full member + user details */
const MEMBERS_INCLUDE = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          publicId: true,
          name: true,
          email: true,
          status: true,
          profile: { select: { code: true, label: true } },
          userType: { select: { code: true, label: true } },
        },
      },
    },
    orderBy: [
      { isLead: 'desc' as const },
      { createdAt: 'asc' as const },
    ],
  },
};

/** Standard select for team queries — includes publicId */
const TEAM_SELECT = {
  id: true,
  publicId: true,
  name: true,
  description: true,
  status: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  ...MEMBERS_INCLUDE,
};

const IS_ADMIN = (u: JwtPayload) => u.profileCode === 'PLATFORM_ADMIN';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageService: UsageService,
  ) {}

  /** Resolve a team publicId to the internal numeric id, or throw 404 */
  private async resolveTeamId(publicId: string): Promise<number> {
    const team = await this.prisma.team.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!team) throw new AppException('TEAM_NOT_FOUND', HttpStatus.NOT_FOUND);
    return team.id;
  }

  /** Resolve a user publicId to the internal numeric id, or throw 404 */
  private async resolveUserId(publicId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!user) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return user.id;
  }

  // ── Teams CRUD ──────────────────────────────────────────────────────────────

  async findAll(requestingUser: JwtPayload) {
    const where = IS_ADMIN(requestingUser)
      ? { status: { not: Status.ARCHIVED } }
      : { status: { not: Status.ARCHIVED }, ownerId: requestingUser.sub };

    return this.prisma.team.findMany({
      where,
      orderBy: { name: 'asc' },
      select: TEAM_SELECT,
    });
  }

  async findOne(publicId: string, requestingUser: JwtPayload) {
    const team = await this.prisma.team.findUnique({
      where: { publicId },
      select: TEAM_SELECT,
    });
    if (!team) throw new AppException('TEAM_NOT_FOUND', HttpStatus.NOT_FOUND);

    if (!IS_ADMIN(requestingUser) && team.ownerId !== requestingUser.sub) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    return team;
  }

  async create(dto: CreateTeamDto, requestingUser: JwtPayload) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: requestingUser.sub,
      },
      select: TEAM_SELECT,
    });

    await this.usageService.increment(requestingUser.sub, 'max_teams');
    return team;
  }

  async update(publicId: string, dto: UpdateTeamDto, requestingUser: JwtPayload) {
    const team = await this.findOne(publicId, requestingUser); // validates ownership
    return this.prisma.team.update({
      where: { id: team.id },
      data: dto,
      select: TEAM_SELECT,
    });
  }

  /** Soft delete — sets status to INACTIVE */
  async remove(publicId: string, requestingUser: JwtPayload) {
    const team = await this.findOne(publicId, requestingUser); // validates ownership
    const updated = await this.prisma.team.update({
      where: { id: team.id },
      data: { status: Status.INACTIVE },
      select: TEAM_SELECT,
    });

    await this.usageService.decrement(requestingUser.sub, 'max_teams');
    return updated;
  }

  // ── Members management ──────────────────────────────────────────────────────

  async addMember(teamPublicId: string, dto: AddMemberDto, requestingUser: JwtPayload) {
    const team = await this.findOne(teamPublicId, requestingUser); // validates team ownership
    const teamId = team.id;

    // Resolve user publicId to internal id
    const userId = await this.resolveUserId(dto.userId);

    // Ensure user exists and check workspace ownership
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, createdById: true },
    });
    if (!user) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    // BASIC_USER pode adicionar qualquer pessoa do seu workspace —
    // a si próprio (self) OU um user que ele criou. Espelha a regra de
    // `users.findAll` (OR: createdById = me, id = me) para que tudo o que
    // aparece em /users também possa ser adicionado a teams.
    const isSelf = userId === requestingUser.sub;
    const isWorkspaceUser = user.createdById === requestingUser.sub;
    if (!IS_ADMIN(requestingUser) && !isSelf && !isWorkspaceUser) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    // Ensure not already a member
    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existing) throw new AppException('MEMBER_ALREADY_EXISTS', HttpStatus.CONFLICT);

    // If new member is lead, demote the current lead first
    if (dto.isLead) {
      await this.prisma.teamMember.updateMany({
        where: { teamId, isLead: true },
        data: { isLead: false },
      });
    }

    await this.prisma.teamMember.create({
      data: { teamId, userId, isLead: dto.isLead ?? false, role: dto.role },
    });

    return this.findOne(teamPublicId, requestingUser);
  }

  async updateMember(teamPublicId: string, userPublicId: string, dto: UpdateMemberDto, requestingUser: JwtPayload) {
    const team = await this.findOne(teamPublicId, requestingUser); // validates team ownership
    const teamId = team.id;
    const userId = await this.resolveUserId(userPublicId);

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) throw new AppException('MEMBER_NOT_FOUND', HttpStatus.NOT_FOUND);

    // If promoting to lead, demote the current lead first
    if (dto.isLead === true && !member.isLead) {
      await this.prisma.teamMember.updateMany({
        where: { teamId, isLead: true },
        data: { isLead: false },
      });
    }

    await this.prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: dto,
    });

    return this.findOne(teamPublicId, requestingUser);
  }

  /** Hard delete of the association (the user continues to exist) */
  async removeMember(teamPublicId: string, userPublicId: string, requestingUser: JwtPayload) {
    const team = await this.findOne(teamPublicId, requestingUser); // validates team ownership
    const teamId = team.id;
    const userId = await this.resolveUserId(userPublicId);

    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) throw new AppException('MEMBER_NOT_FOUND', HttpStatus.NOT_FOUND);

    await this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    return this.findOne(teamPublicId, requestingUser);
  }
}
