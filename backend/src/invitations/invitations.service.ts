import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { InviteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';
import { upsertWorkspaceMemberFromProjectAccept } from '../users/billing-helpers';

const IS_ADMIN = (u: JwtPayload) => u.profileCode === 'PLATFORM_ADMIN';

/**
 * Include interno — mantém `id` em invitedBy/project para uso do service
 * (notificações precisam do `userId` numérico do convidante). NÃO devolver
 * directamente na API; usar `serializeInvite()` antes.
 */
const INVITE_INCLUDE = {
  project: { select: { id: true, publicId: true, name: true, ownerId: true } },
  invitedBy: { select: { id: true, publicId: true, name: true, email: true } },
  user: { select: { id: true, publicId: true, name: true, email: true } },
} as const;

type InviteWithIncludes = {
  publicId: string;
  email: string | null;
  status: InviteStatus;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  project:   { publicId: string; name: string };
  /** invitedBy nullable após Phase 7: o inviter pode ter sido removido (FK SetNull). */
  invitedBy: { publicId: string; name: string; email: string } | null;
  user:      { publicId: string; name: string; email: string } | null;
};

function serializeInvite(invite: {
  publicId: string;
  email: string | null;
  status: InviteStatus;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  project:   { publicId: string; name: string };
  invitedBy: { publicId: string; name: string; email: string } | null;
  user:      { publicId: string; name: string; email: string } | null;
}): InviteWithIncludes {
  return {
    publicId:  invite.publicId,
    email:     invite.email,
    status:    invite.status,
    role:      invite.role,
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt,
    project: {
      publicId: invite.project.publicId,
      name:     invite.project.name,
    },
    invitedBy: invite.invitedBy ? {
      publicId: invite.invitedBy.publicId,
      name:     invite.invitedBy.name,
      email:    invite.invitedBy.email,
    } : null,
    user: invite.user ? {
      publicId: invite.user.publicId,
      name:     invite.user.name,
      email:    invite.user.email,
    } : null,
  };
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Resolve helper ──────────────────────────────────────────────────────

  private async resolveInvitationId(publicId: string): Promise<number> {
    const invite = await this.prisma.projectMember.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!invite) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return invite.id;
  }

  /** Convites pendentes para o utilizador autenticado */
  async getPending(requestingUser: JwtPayload) {
    const rows = await this.prisma.projectMember.findMany({
      where: {
        userId: requestingUser.sub,
        status: InviteStatus.INVITED,
      },
      include: INVITE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(serializeInvite);
  }

  /** Todos os convites recebidos pelo utilizador (incluindo aceites/recusados) */
  async getAll(requestingUser: JwtPayload) {
    const rows = await this.prisma.projectMember.findMany({
      where: { userId: requestingUser.sub },
      include: INVITE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeInvite);
  }

  /** Aceitar convite */
  async accept(publicId: string, requestingUser: JwtPayload) {
    const id = await this.resolveInvitationId(publicId);
    const invite = await this.findAndValidateOwnership(id, requestingUser);

    if (invite.status !== InviteStatus.INVITED) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    const updated = await this.prisma.projectMember.update({
      where: { id },
      data: { status: InviteStatus.ACCEPTED },
      include: INVITE_INCLUDE,
    });

    // Add user to the designated team (upsert to avoid duplicates)
    if (invite.teamId) {
      await this.prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: invite.teamId, userId: requestingUser.sub } },
        create: { teamId: invite.teamId, userId: requestingUser.sub, isLead: false },
        update: {},
      });
    }

    // Phase 3 dual-write: ensure a WorkspaceMember mirrors this acceptance.
    // Skips self-ownership and projects without an owner.
    if (invite.project.ownerId != null) {
      await upsertWorkspaceMemberFromProjectAccept(this.prisma, {
        ownerId: invite.project.ownerId,
        userId: requestingUser.sub,
        email: invite.email,
        name: invite.name,
        invitedById: invite.invitedById,
      });
    }

    // Notify the inviter (fire-and-forget, non-blocking).
    // invitedBy pode ser null se o inviter foi removido entretanto — skip notify.
    const inviteeName = invite.user?.name ?? invite.email ?? 'Utilizador';
    if (invite.invitedBy) {
      this.notificationsService.createInvitationAcceptedNotification(
        invite.invitedBy.id,
        inviteeName,
        invite.project.name,
        invite.project.publicId,
      ).catch(() => { /* notification failure must not break accept */ });
    }

    return serializeInvite(updated);
  }

  /** Recusar convite */
  async decline(publicId: string, requestingUser: JwtPayload) {
    const id = await this.resolveInvitationId(publicId);
    const invite = await this.findAndValidateOwnership(id, requestingUser);

    if (invite.status !== InviteStatus.INVITED) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    const updated = await this.prisma.projectMember.update({
      where: { id },
      data: { status: InviteStatus.DECLINED },
      include: INVITE_INCLUDE,
    });

    // Notify the inviter (fire-and-forget). Skip if inviter foi removido.
    const inviteeName = invite.user?.name ?? invite.email ?? 'Utilizador';
    if (invite.invitedBy) {
      this.notificationsService.createInvitationDeclinedNotification(
        invite.invitedBy.id,
        inviteeName,
        invite.project.name,
        invite.project.publicId,
      ).catch(() => { /* notification failure must not break decline */ });
    }

    return serializeInvite(updated);
  }

  /** Reenviar convite (reset para INVITED) — apenas quem convidou ou PLATFORM_ADMIN */
  async resend(publicId: string, requestingUser: JwtPayload) {
    const id = await this.resolveInvitationId(publicId);

    const invite = await this.prisma.projectMember.findUnique({
      where: { id },
      include: { project: { select: { id: true, publicId: true, name: true, ownerId: true } } },
    });
    if (!invite) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    const canResend =
      IS_ADMIN(requestingUser) ||
      invite.invitedById === requestingUser.sub ||
      invite.project.ownerId === requestingUser.sub;

    if (!canResend) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    const updated = await this.prisma.projectMember.update({
      where: { id },
      data: { status: InviteStatus.INVITED },
      include: INVITE_INCLUDE,
    });
    return serializeInvite(updated);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async findAndValidateOwnership(id: number, requestingUser: JwtPayload) {
    const invite = await this.prisma.projectMember.findUnique({
      where: { id },
      include: INVITE_INCLUDE,
    });
    if (!invite) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    if (!IS_ADMIN(requestingUser) && invite.userId !== requestingUser.sub) {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    return invite;
  }
}
