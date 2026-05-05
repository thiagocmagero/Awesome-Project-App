import { HttpStatus, Injectable } from '@nestjs/common';
import { InviteStatus, ProjectRole } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ProjectAction, DEFAULT_PERMISSIONS, DELEGATABLE_ACTIONS, ACTION_GROUPS } from './project-permissions';

const IS_ADMIN = (u: JwtPayload) => u.profileCode === 'PLATFORM_ADMIN';

@Injectable()
export class ProjectPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Role resolution ────────────────────────────────────────────────────────

  /**
   * Resolves the effective role of a user within a project.
   * Returns null if the user has no relationship with the project.
   */
  async resolveRole(
    projectId: number,
    userId: number,
    profileCode?: string,
  ): Promise<'PLATFORM_ADMIN' | 'OWNER' | ProjectRole | null> {
    if (profileCode === 'PLATFORM_ADMIN') return 'PLATFORM_ADMIN';

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project) return null;
    if (project.ownerId === userId) return 'OWNER';

    // Check direct project membership first
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, status: InviteStatus.ACCEPTED },
      select: { role: true },
    });
    if (member) return member.role;

    // Check team-based access — user is in a team associated with the project
    const teamAccess = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        team: { projects: { some: { projectId } } },
      },
      select: { userId: true },
    });
    if (teamAccess) return ProjectRole.READER;

    return null;
  }

  /**
   * Resolves the effective role by project publicId (for guards that receive UUID params).
   */
  async resolveRoleByPublicId(
    projectPublicId: string,
    userId: number,
    profileCode?: string,
  ): Promise<{ projectId: number; role: 'PLATFORM_ADMIN' | 'OWNER' | ProjectRole | null }> {
    if (profileCode === 'PLATFORM_ADMIN') {
      const p = await this.prisma.project.findUnique({
        where: { publicId: projectPublicId },
        select: { id: true },
      });
      if (!p) return { projectId: 0, role: null };
      return { projectId: p.id, role: 'PLATFORM_ADMIN' };
    }

    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true, ownerId: true },
    });
    if (!project) return { projectId: 0, role: null };
    if (project.ownerId === userId) return { projectId: project.id, role: 'OWNER' };

    const member = await this.prisma.projectMember.findFirst({
      where: { projectId: project.id, userId, status: InviteStatus.ACCEPTED },
      select: { role: true },
    });
    return { projectId: project.id, role: member?.role ?? null };
  }

  // ── Permission check ───────────────────────────────────────────────────────

  /**
   * Checks whether a user can perform a given action on a project.
   * Resolution order: admin → owner → default for role → grants by role → grants by user.
   */
  async can(projectId: number, userId: number, action: ProjectAction, profileCode?: string): Promise<boolean> {
    const role = await this.resolveRole(projectId, userId, profileCode);
    if (!role) return false;
    if (role === 'PLATFORM_ADMIN' || role === 'OWNER') return true;

    // Check defaults
    const defaults = DEFAULT_PERMISSIONS[role as 'CONTRIBUTOR' | 'READER'] ?? [];
    if (defaults.includes(action)) return true;

    // Check grants by role
    const roleGrant = await this.prisma.projectPermissionGrant.findUnique({
      where: { uq_grant_role: { projectId, action, grantedToRole: role as ProjectRole } },
      select: { id: true },
    });
    if (roleGrant) return true;

    // Check grants by individual user
    const userGrant = await this.prisma.projectPermissionGrant.findUnique({
      where: { uq_grant_user: { projectId, action, grantedToUserId: userId } },
      select: { id: true },
    });
    return !!userGrant;
  }

  // ── Resolve all permissions for a user (frontend hook) ─────────────────────

  /**
   * Returns the full list of actions a user can perform on a project.
   * Used by GET /projects/:id/my-permissions.
   */
  async resolveAll(
    projectPublicId: string,
    user: JwtPayload,
  ): Promise<{ role: string; permissions: ProjectAction[] }> {
    const { projectId, role } = await this.resolveRoleByPublicId(projectPublicId, user.sub, user.profileCode);
    if (!role) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);

    // Admin and owner get all actions
    if (role === 'PLATFORM_ADMIN' || role === 'OWNER') {
      return { role, permissions: Object.values(ProjectAction) };
    }

    const defaults = new Set(DEFAULT_PERMISSIONS[role as 'CONTRIBUTOR' | 'READER'] ?? []);

    // Fetch all grants (by role + by user)
    const grants = await this.prisma.projectPermissionGrant.findMany({
      where: {
        projectId,
        OR: [
          { grantedToRole: role as ProjectRole },
          { grantedToUserId: user.sub },
        ],
      },
      select: { action: true },
    });

    for (const g of grants) {
      defaults.add(g.action as ProjectAction);
    }

    return { role, permissions: Array.from(defaults) };
  }

  // ── Grants CRUD ────────────────────────────────────────────────────────────

  async listGrants(projectPublicId: string, requestingUser: JwtPayload) {
    const { projectId } = await this.assertPermission(projectPublicId, requestingUser, ProjectAction.PERMISSIONS_MANAGE);

    const grants = await this.prisma.projectPermissionGrant.findMany({
      where: { projectId },
      select: {
        publicId: true,
        action: true,
        grantedToRole: true,
        grantedToUser: { select: { publicId: true, name: true, email: true } },
        grantedBy: { select: { publicId: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Direct project members (invited)
    const directMembers = await this.prisma.projectMember.findMany({
      where: { projectId, status: InviteStatus.ACCEPTED },
      select: {
        publicId: true,
        role: true,
        user: { select: { publicId: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Team members (via project teams) — deduplicated, excluding owner and direct members
    const projectWithTeams = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        publicId: true,
        name: true,
        ownerId: true,
        owner: { select: { publicId: true, name: true, email: true } },
        teams: {
          include: {
            team: {
              select: {
                name: true,
                members: {
                  select: {
                    user: { select: { publicId: true, name: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Build deduplicated member list: direct members + team members
    const seenUserPublicIds = new Set<string>();
    // Track direct member publicIds
    for (const dm of directMembers) {
      if (dm.user?.publicId) seenUserPublicIds.add(dm.user.publicId);
    }
    // Owner is shown separately
    if (projectWithTeams?.owner?.publicId) {
      seenUserPublicIds.add(projectWithTeams.owner.publicId);
    }

    // Team members not already in direct members
    const teamMembers: Array<{ publicId: string | null; role: string; user: { publicId: string; name: string; email: string }; teamName: string }> = [];
    for (const pt of projectWithTeams?.teams ?? []) {
      for (const tm of pt.team.members) {
        if (tm.user && !seenUserPublicIds.has(tm.user.publicId)) {
          seenUserPublicIds.add(tm.user.publicId);
          teamMembers.push({
            publicId: null, // no ProjectMember record — team-based access
            role: 'READER', // default for team members without explicit role
            user: tm.user,
            teamName: pt.team.name,
          });
        }
      }
    }

    // Merge both lists — direct members first, then team-only members
    const members = [
      ...directMembers.map((dm) => ({ ...dm, teamName: null as string | null })),
      ...teamMembers,
    ];

    return {
      project: projectWithTeams ? {
        publicId: projectWithTeams.publicId,
        name: projectWithTeams.name,
        ownerId: projectWithTeams.ownerId,
        owner: projectWithTeams.owner,
      } : null,
      members,
      grants,
      actionGroups: ACTION_GROUPS,
      delegatableActions: Array.from(DELEGATABLE_ACTIONS),
      defaultPermissions: DEFAULT_PERMISSIONS,
    };
  }

  async grantPermission(
    projectPublicId: string,
    dto: { action: string; grantedToRole?: string; grantedToUserPublicId?: string },
    requestingUser: JwtPayload,
  ) {
    const { projectId } = await this.assertPermission(projectPublicId, requestingUser, ProjectAction.PERMISSIONS_MANAGE);

    // Validate action is a valid ProjectAction and is delegatable
    if (!Object.values(ProjectAction).includes(dto.action as ProjectAction)) {
      throw new AppException('INVALID_ACTION', HttpStatus.BAD_REQUEST);
    }
    if (!DELEGATABLE_ACTIONS.has(dto.action as ProjectAction)) {
      throw new AppException('ACTION_NOT_DELEGATABLE', HttpStatus.BAD_REQUEST);
    }

    if (dto.grantedToRole) {
      // Grant to a role
      const role = dto.grantedToRole as ProjectRole;
      if (role !== ProjectRole.CONTRIBUTOR && role !== ProjectRole.READER) {
        throw new AppException('INVALID_ROLE', HttpStatus.BAD_REQUEST);
      }
      return this.prisma.projectPermissionGrant.upsert({
        where: { uq_grant_role: { projectId, action: dto.action, grantedToRole: role } },
        create: { projectId, action: dto.action, grantedToRole: role, grantedById: requestingUser.sub },
        update: {},
      });
    }

    if (dto.grantedToUserPublicId) {
      // Grant to an individual user
      const user = await this.prisma.user.findUnique({
        where: { publicId: dto.grantedToUserPublicId },
        select: { id: true },
      });
      if (!user) throw new AppException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);

      return this.prisma.projectPermissionGrant.upsert({
        where: { uq_grant_user: { projectId, action: dto.action, grantedToUserId: user.id } },
        create: { projectId, action: dto.action, grantedToUserId: user.id, grantedById: requestingUser.sub },
        update: {},
      });
    }

    throw new AppException('GRANT_TARGET_REQUIRED', HttpStatus.BAD_REQUEST);
  }

  async revokeGrant(projectPublicId: string, grantPublicId: string, requestingUser: JwtPayload) {
    await this.assertPermission(projectPublicId, requestingUser, ProjectAction.PERMISSIONS_MANAGE);

    const grant = await this.prisma.projectPermissionGrant.findUnique({
      where: { publicId: grantPublicId },
      select: { id: true },
    });
    if (!grant) throw new AppException('GRANT_NOT_FOUND', HttpStatus.NOT_FOUND);

    await this.prisma.projectPermissionGrant.delete({ where: { id: grant.id } });
    return { deleted: true };
  }

  // ── Member role management ─────────────────────────────────────────────────

  async updateMemberRole(
    projectPublicId: string,
    memberPublicId: string,
    newRole: ProjectRole,
    requestingUser: JwtPayload,
  ) {
    const { projectId } = await this.assertPermission(projectPublicId, requestingUser, ProjectAction.MEMBER_CHANGE_ROLE);

    if (newRole === ProjectRole.OWNER) {
      throw new AppException('CANNOT_SET_OWNER_ROLE', HttpStatus.BAD_REQUEST);
    }

    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, publicId: memberPublicId },
      select: { id: true },
    });
    if (!member) throw new AppException('MEMBER_NOT_FOUND', HttpStatus.NOT_FOUND);

    return this.prisma.projectMember.update({
      where: { id: member.id },
      data: { role: newRole },
      select: { publicId: true, role: true },
    });
  }

  // ── Bulk helpers (for cross-project flows: notifications fanout, global pages) ─

  /**
   * Returns userIds with a given action on a project.
   * Source order: project owner → role grants (CONTRIBUTOR/READER members) →
   * individual user grants → role defaults (CONTRIBUTOR/READER members if action is in default).
   */
  async findUserIdsWithAction(projectId: number, action: ProjectAction): Promise<number[]> {
    const ids = new Set<number>();

    // Owner
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (project?.ownerId) ids.add(project.ownerId);

    // Default role for the action
    const rolesWithDefault: ProjectRole[] = [];
    if (DEFAULT_PERMISSIONS.CONTRIBUTOR.includes(action)) rolesWithDefault.push(ProjectRole.CONTRIBUTOR);
    if (DEFAULT_PERMISSIONS.READER.includes(action)) rolesWithDefault.push(ProjectRole.READER);

    // Role grants (this action granted to a role)
    const roleGrants = await this.prisma.projectPermissionGrant.findMany({
      where: { projectId, action, grantedToRole: { not: null } },
      select: { grantedToRole: true },
    });
    for (const rg of roleGrants) if (rg.grantedToRole) rolesWithDefault.push(rg.grantedToRole);

    // Members whose role gives them the action
    if (rolesWithDefault.length > 0) {
      const members = await this.prisma.projectMember.findMany({
        where: {
          projectId,
          status: InviteStatus.ACCEPTED,
          role: { in: rolesWithDefault },
          userId: { not: null },
        },
        select: { userId: true },
      });
      for (const m of members) if (m.userId) ids.add(m.userId);

      // Team members default to READER role for permission resolution.
      if (rolesWithDefault.includes(ProjectRole.READER)) {
        const teamMembers = await this.prisma.teamMember.findMany({
          where: { team: { projects: { some: { projectId } } } },
          select: { userId: true },
        });
        for (const tm of teamMembers) ids.add(tm.userId);
      }
    }

    // Individual grants
    const userGrants = await this.prisma.projectPermissionGrant.findMany({
      where: { projectId, action, grantedToUserId: { not: null } },
      select: { grantedToUserId: true },
    });
    for (const ug of userGrants) if (ug.grantedToUserId) ids.add(ug.grantedToUserId);

    return Array.from(ids);
  }

  /**
   * Returns projectIds where a given user has a given action.
   * Used by the global TimesheetController for the "Para aprovar" tab.
   */
  async findProjectIdsWithAction(userId: number, action: ProjectAction): Promise<number[]> {
    const ids = new Set<number>();

    // Owned projects
    const owned = await this.prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    for (const p of owned) ids.add(p.id);

    // Direct memberships where the user's role has the action by default OR via role grant
    const memberships = await this.prisma.projectMember.findMany({
      where: { userId, status: InviteStatus.ACCEPTED },
      select: { projectId: true, role: true },
    });
    for (const m of memberships) {
      const defaults = DEFAULT_PERMISSIONS[m.role as 'CONTRIBUTOR' | 'READER'] ?? [];
      if (defaults.includes(action)) {
        ids.add(m.projectId);
        continue;
      }
      // Role-grant for this project + role + action
      const rg = await this.prisma.projectPermissionGrant.findUnique({
        where: { uq_grant_role: { projectId: m.projectId, action, grantedToRole: m.role as ProjectRole } },
        select: { id: true },
      });
      if (rg) ids.add(m.projectId);
    }

    // Individual grants (any project)
    const indGrants = await this.prisma.projectPermissionGrant.findMany({
      where: { action, grantedToUserId: userId },
      select: { projectId: true },
    });
    for (const ig of indGrants) ids.add(ig.projectId);

    // Team-based projects (READER role by default) — only if action is in READER defaults
    if (DEFAULT_PERMISSIONS.READER.includes(action)) {
      const teamProjects = await this.prisma.projectTeam.findMany({
        where: { team: { members: { some: { userId } } } },
        select: { projectId: true },
      });
      for (const tp of teamProjects) ids.add(tp.projectId);
    }

    return Array.from(ids);
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Asserts the requesting user has a specific permission on the project.
   * Returns { projectId } for chaining further queries.
   */
  private async assertPermission(
    projectPublicId: string,
    requestingUser: JwtPayload,
    action: ProjectAction,
  ): Promise<{ projectId: number }> {
    const { projectId, role } = await this.resolveRoleByPublicId(
      projectPublicId, requestingUser.sub, requestingUser.profileCode,
    );
    if (!role) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);

    // Admin and owner always pass
    if (role === 'PLATFORM_ADMIN' || role === 'OWNER') return { projectId };

    // Check defaults + grants
    const allowed = await this.can(projectId, requestingUser.sub, action, requestingUser.profileCode);
    if (!allowed) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);

    return { projectId };
  }
}
