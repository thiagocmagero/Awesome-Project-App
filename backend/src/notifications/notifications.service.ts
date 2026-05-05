import { Injectable } from '@nestjs/common';
import { EntityType, NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Preference guard ────────────────────────────────────────────────────────

  /** Opt-out model: missing record = enabled. */
  async shouldNotify(
    userId: number,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId_type_channel: { userId, type, channel } },
    });
    return pref?.enabled ?? true;
  }

  // ─── Creators ────────────────────────────────────────────────────────────────

  async createMentionNotification(
    actorName: string,
    mentionedUserId: number,
    projectPublicId: string,
    entityType: EntityType,
    entityPublicId: string,
    excerpt: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(mentionedUserId, NotificationType.MENTION, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId: mentionedUserId,
        type: NotificationType.MENTION,
        title: `${actorName} mencionou-te`,
        body: excerpt,
        entityType,
        entityPublicId,
        projectPublicId,
      },
    });
  }

  async createTaskAssignedNotification(
    assignerName: string,
    assigneeUserId: number,
    projectPublicId: string,
    taskPublicId: string,
    taskName: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(assigneeUserId, NotificationType.TASK_ASSIGNED, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId: assigneeUserId,
        type: NotificationType.TASK_ASSIGNED,
        title: `${assignerName} atribuiu-te uma tarefa`,
        body: taskName,
        entityType: EntityType.TASK,
        entityPublicId: taskPublicId,
        projectPublicId,
      },
    });
  }

  async createInvitationReceivedNotification(
    userId: number,
    inviterName: string,
    projectName: string,
    projectPublicId: string,
    invitationPublicId: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(userId, NotificationType.INVITATION_RECEIVED, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.INVITATION_RECEIVED,
        title: `${inviterName} convidou-te para um projeto`,
        body: `Projeto: ${projectName}`,
        entityPublicId: invitationPublicId,
        projectPublicId,
      },
    });
  }

  async createInvitationAcceptedNotification(
    userId: number,
    inviteeName: string,
    projectName: string,
    projectPublicId: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(userId, NotificationType.INVITATION_ACCEPTED, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.INVITATION_ACCEPTED,
        title: `${inviteeName} aceitou o convite`,
        body: `Projeto: ${projectName}`,
        projectPublicId,
      },
    });
  }

  async createInvitationDeclinedNotification(
    userId: number,
    inviteeName: string,
    projectName: string,
    projectPublicId: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(userId, NotificationType.INVITATION_DECLINED, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.INVITATION_DECLINED,
        title: `${inviteeName} recusou o convite`,
        body: `Projeto: ${projectName}`,
        projectPublicId,
      },
    });
  }

  async createCommentReactionNotification(
    userId: number,
    reactorName: string,
    emoji: string,
    projectPublicId: string,
    entityPublicId: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(userId, NotificationType.COMMENT_REACTION, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.COMMENT_REACTION,
        title: `${reactorName} reagiu ao teu comentário`,
        body: `Reação: ${emoji}`,
        projectPublicId,
        entityPublicId,
      },
    });
  }

  // ─── Timesheet notifications ─────────────────────────────────────────────────

  /** Disparada quando um user submete a sua semana — fanout para cada aprovador. */
  async createTimesheetSubmittedNotification(
    approverUserId: number,
    submitterName: string,
    projectName: string,
    projectPublicId: string,
    weekStartIso: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(approverUserId, NotificationType.TIMESHEET_SUBMITTED, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId: approverUserId,
        type: NotificationType.TIMESHEET_SUBMITTED,
        title: `${submitterName} submeteu uma timesheet`,
        body: `Projeto: ${projectName} · Semana: ${weekStartIso}`,
        projectPublicId,
      },
    });
  }

  /** Disparada quando a semana de um user fica totalmente APPROVED. */
  async createTimesheetApprovedNotification(
    submitterUserId: number,
    approverName: string,
    projectName: string,
    projectPublicId: string,
    weekStartIso: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_APPROVED, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId: submitterUserId,
        type: NotificationType.TIMESHEET_APPROVED,
        title: `${approverName} aprovou a tua timesheet`,
        body: `Projeto: ${projectName} · Semana: ${weekStartIso}`,
        projectPublicId,
      },
    });
  }

  /** Disparada quando a semana de um user passa a PARTIAL. */
  async createTimesheetPartiallyApprovedNotification(
    submitterUserId: number,
    approverName: string,
    projectName: string,
    projectPublicId: string,
    weekStartIso: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_PARTIALLY_APPROVED, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId: submitterUserId,
        type: NotificationType.TIMESHEET_PARTIALLY_APPROVED,
        title: `${approverName} aprovou parte da tua timesheet`,
        body: `Projeto: ${projectName} · Semana: ${weekStartIso} · Há dias pendentes ou rejeitados`,
        projectPublicId,
      },
    });
  }

  /**
   * Disparada quando um dia/semana é REJECTED. `reason` é incluído no body
   * (REQ-N04). `scopeDateIso` identifica o dia ou início da semana rejeitada.
   */
  async createTimesheetRejectedNotification(
    submitterUserId: number,
    approverName: string,
    projectName: string,
    projectPublicId: string,
    scopeDateIso: string,
    reason: string,
  ): Promise<void> {
    if (!(await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_REJECTED, NotificationChannel.IN_APP))) return;
    await this.prisma.notification.create({
      data: {
        userId: submitterUserId,
        type: NotificationType.TIMESHEET_REJECTED,
        title: `${approverName} rejeitou parte da tua timesheet`,
        body: `Projeto: ${projectName} · Data: ${scopeDateIso} · Motivo: ${reason}`,
        projectPublicId,
      },
    });
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async findAllForUser(userId: number, cursor?: string, limit = 20) {
    const take = Math.min(limit, 50);
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { publicId: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > take;
    if (hasMore) items.pop();
    return {
      items: items.map(NotificationResponseDto.from),
      nextCursor: hasMore ? items[items.length - 1].publicId : null,
    };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(userId: number, publicIds: string[]): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, publicId: { in: publicIds } },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  // ─── Preferences ─────────────────────────────────────────────────────────────

  async findPreferences(userId: number) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      select: {
        publicId: true,
        type: true,
        channel: true,
        enabled: true,
      },
    });
  }

  async upsertPreference(
    userId: number,
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<void> {
    await this.prisma.notificationPreference.upsert({
      where: { userId_type_channel: { userId, type, channel } },
      create: { userId, type, channel, enabled },
      update: { enabled },
    });
  }
}
