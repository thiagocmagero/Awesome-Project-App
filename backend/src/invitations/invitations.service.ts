import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception';
import { InviteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { NotificationsService } from '../notifications/notifications.service';

const IS_ADMIN = (u: JwtPayload) => u.profileCode === 'PLATFORM_ADMIN';

/** Fields returned for each invitation */
const INVITE_INCLUDE = {
  project: { select: { id: true, publicId: true, name: true } },
  invitedBy: { select: { id: true, publicId: true, name: true, email: true } },
  user: { select: { id: true, publicId: true, name: true, email: true } },
} as const;

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
    return this.prisma.projectMember.findMany({
      where: {
        userId: requestingUser.sub,
        status: InviteStatus.INVITED,
      },
      include: INVITE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Todos os convites recebidos pelo utilizador (incluindo aceites/recusados) */
  async getAll(requestingUser: JwtPayload) {
    return this.prisma.projectMember.findMany({
      where: { userId: requestingUser.sub },
      include: INVITE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
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
      include: {
        ...INVITE_INCLUDE,
        // teamId is a scalar — Prisma returns it with the record
      },
    });

    // Add user to the designated team (upsert to avoid duplicates)
    if (invite.teamId) {
      await this.prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: invite.teamId, userId: requestingUser.sub } },
        create: { teamId: invite.teamId, userId: requestingUser.sub, isLead: false },
        update: {},
      });
    }

    // Notify the inviter (fire-and-forget, non-blocking)
    const inviteeName = invite.user?.name ?? invite.email ?? 'Utilizador';
    this.notificationsService.createInvitationAcceptedNotification(
      invite.invitedBy.id,
      inviteeName,
      invite.project.name,
      invite.project.publicId,
    ).catch(() => { /* notification failure must not break accept */ });

    return updated;
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

    // Notify the inviter (fire-and-forget, non-blocking)
    const inviteeName = invite.user?.name ?? invite.email ?? 'Utilizador';
    this.notificationsService.createInvitationDeclinedNotification(
      invite.invitedBy.id,
      inviteeName,
      invite.project.name,
      invite.project.publicId,
    ).catch(() => { /* notification failure must not break decline */ });

    return updated;
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

    return this.prisma.projectMember.update({
      where: { id },
      data: { status: InviteStatus.INVITED },
      include: INVITE_INCLUDE,
    });
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
