import { Injectable, Logger } from '@nestjs/common';
import { EntityType, NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../emails/email.service';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

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

  // ─── Resolvers (helpers privados) ────────────────────────────────────────────

  /** Lê email + name + locale do destinatário. Devolve null se não encontrar. */
  private async resolveRecipient(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, locale: true },
    });
  }

  /** Lê o nome do projecto a partir do publicId. Devolve string vazia se ausente. */
  private async resolveProjectName(projectPublicId: string): Promise<string> {
    const p = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { name: true },
    });
    return p?.name ?? '';
  }

  /** Resolve o nome contextual (task name ou project name). */
  private async resolveContextName(
    projectPublicId: string,
    entityType: EntityType,
    entityPublicId: string,
  ): Promise<string> {
    if (entityType === EntityType.TASK) {
      const task = await this.prisma.task.findUnique({
        where: { publicId: entityPublicId },
        select: { text: true },
      });
      if (task?.text) return task.text;
    }
    return this.resolveProjectName(projectPublicId);
  }

  /** Base URL (APP_URL com trailing slash removido). */
  private get baseUrl(): string {
    return (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
  }

  /**
   * Resolve o prefixo workspace `/{workspacePublicId}` a partir do projecto.
   * Retorna `''` se o projecto não existir ou não tiver workspace (orphan
   * pré-migração) — deeplink degrada graciosamente para o redirect raiz.
   */
  private async resolveWorkspacePrefixForProject(projectPublicId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { workspace: { select: { publicId: true } } },
    });
    const wsPublicId = project?.workspace?.publicId;
    return wsPublicId ? `/${wsPublicId}` : '';
  }

  /** Resolve workspace do user (V1: 1:1). Fallback `''` se não existir. */
  private async resolveWorkspacePrefixForUser(userId: number): Promise<string> {
    const ws = await this.prisma.workspace.findUnique({
      where: { ownerId: userId },
      select: { publicId: true },
    });
    return ws?.publicId ? `/${ws.publicId}` : '';
  }

  private async buildTaskUrl(projectPublicId: string, taskPublicId: string): Promise<string> {
    const wsPrefix = await this.resolveWorkspacePrefixForProject(projectPublicId);
    return `${this.baseUrl}${wsPrefix}/projects/${projectPublicId}/planning/tasks/${taskPublicId}`;
  }

  private async buildEntityUrl(
    projectPublicId: string,
    entityType: EntityType,
    entityPublicId: string,
  ): Promise<string> {
    if (entityType === EntityType.TASK) {
      return this.buildTaskUrl(projectPublicId, entityPublicId);
    }
    const wsPrefix = await this.resolveWorkspacePrefixForProject(projectPublicId);
    return `${this.baseUrl}${wsPrefix}/projects/${projectPublicId}/planning`;
  }

  private async buildProjectUrl(projectPublicId: string): Promise<string> {
    const wsPrefix = await this.resolveWorkspacePrefixForProject(projectPublicId);
    return `${this.baseUrl}${wsPrefix}/projects/${projectPublicId}/planning`;
  }

  /**
   * URL da lista de projectos do user. Usado como fallback de `inviteUrl`
   * quando o caller não fornece. Resolve o workspace do destinatário.
   */
  private async buildProjectsListUrlForUser(userId: number): Promise<string> {
    const wsPrefix = await this.resolveWorkspacePrefixForUser(userId);
    return `${this.baseUrl}${wsPrefix}/projects`;
  }

  private async buildTimesheetUrl(projectPublicId: string, weekStart: string): Promise<string> {
    const wsPrefix = await this.resolveWorkspacePrefixForProject(projectPublicId);
    return `${this.baseUrl}${wsPrefix}/projects/${projectPublicId}/planning?tab=timesheet&week=${weekStart}`;
  }

  // ─── Creators ────────────────────────────────────────────────────────────────
  //
  // Cada `createXxxNotification` faz fan-out independente:
  //   - IN_APP: cria registo `Notification` se `shouldNotify(IN_APP)`.
  //   - EMAIL:  resolve destinatário e dispara email se `shouldNotify(EMAIL)`.
  //
  // Os dois canais são independentes — user pode ter só um, ambos, ou nenhum.
  // Falhas em qualquer ramo são silenciosas (logger.error / .catch). Os
  // callers são todos fire-and-forget.

  async createMentionNotification(
    actorName: string,
    mentionedUserId: number,
    projectPublicId: string,
    entityType: EntityType,
    entityPublicId: string,
    excerpt: string,
  ): Promise<void> {
    if (await this.shouldNotify(mentionedUserId, NotificationType.MENTION, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(mentionedUserId, NotificationType.MENTION, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(mentionedUserId);
      if (!recipient?.email) return;
      const [projectName, contextName] = await Promise.all([
        this.resolveProjectName(projectPublicId),
        this.resolveContextName(projectPublicId, entityType, entityPublicId),
      ]);
      const commentUrl = await this.buildEntityUrl(projectPublicId, entityType, entityPublicId);
      this.emailService
        .sendMentionEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          actorName,
          projectName,
          contextName,
          excerpt,
          commentUrl,
        })
        .catch(() => {/* silent — emailService logs internally */});
    }
  }

  async createTaskAssignedNotification(
    assignerName: string,
    assigneeUserId: number,
    projectPublicId: string,
    taskPublicId: string,
    taskName: string,
  ): Promise<void> {
    if (await this.shouldNotify(assigneeUserId, NotificationType.TASK_ASSIGNED, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(assigneeUserId, NotificationType.TASK_ASSIGNED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(assigneeUserId);
      if (!recipient?.email) return;
      const [projectName, taskUrl] = await Promise.all([
        this.resolveProjectName(projectPublicId),
        this.buildTaskUrl(projectPublicId, taskPublicId),
      ]);
      this.emailService
        .sendTaskAssignedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          actorName: assignerName,
          projectName,
          taskName,
          taskUrl,
        })
        .catch(() => {});
    }
  }

  async createInvitationReceivedNotification(
    userId: number,
    inviterName: string,
    projectName: string,
    projectPublicId: string,
    invitationPublicId: string,
    inviteUrl?: string,
  ): Promise<void> {
    if (await this.shouldNotify(userId, NotificationType.INVITATION_RECEIVED, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(userId, NotificationType.INVITATION_RECEIVED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(userId);
      if (!recipient?.email) return;
      const resolvedInviteUrl = inviteUrl ?? (await this.buildProjectsListUrlForUser(userId));
      this.emailService
        .sendInvitationReceivedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          inviterName,
          projectName,
          inviteUrl: resolvedInviteUrl,
        })
        .catch(() => {});
    }
  }

  async createInvitationAcceptedNotification(
    userId: number,
    inviteeName: string,
    projectName: string,
    projectPublicId: string,
  ): Promise<void> {
    if (await this.shouldNotify(userId, NotificationType.INVITATION_ACCEPTED, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(userId, NotificationType.INVITATION_ACCEPTED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(userId);
      if (!recipient?.email) return;
      const projectUrl = await this.buildProjectUrl(projectPublicId);
      this.emailService
        .sendInvitationAcceptedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          inviteeName,
          projectName,
          projectUrl,
        })
        .catch(() => {});
    }
  }

  async createInvitationDeclinedNotification(
    userId: number,
    inviteeName: string,
    projectName: string,
    projectPublicId: string,
  ): Promise<void> {
    if (await this.shouldNotify(userId, NotificationType.INVITATION_DECLINED, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(userId, NotificationType.INVITATION_DECLINED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(userId);
      if (!recipient?.email) return;
      this.emailService
        .sendInvitationDeclinedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          inviteeName,
          projectName,
        })
        .catch(() => {});
    }
  }

  async createCommentReactionNotification(
    userId: number,
    reactorName: string,
    emoji: string,
    projectPublicId: string,
    entityPublicId: string,
  ): Promise<void> {
    if (await this.shouldNotify(userId, NotificationType.COMMENT_REACTION, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(userId, NotificationType.COMMENT_REACTION, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(userId);
      if (!recipient?.email) return;
      // Reactions estão sempre num comment ligado a uma TASK no fluxo actual.
      const [projectName, contextName, commentUrl] = await Promise.all([
        this.resolveProjectName(projectPublicId),
        this.resolveContextName(projectPublicId, EntityType.TASK, entityPublicId),
        this.buildEntityUrl(projectPublicId, EntityType.TASK, entityPublicId),
      ]);
      this.emailService
        .sendCommentReactionEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          actorName: reactorName,
          emoji,
          projectName,
          contextName,
          commentUrl,
        })
        .catch(() => {});
    }
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
    if (await this.shouldNotify(approverUserId, NotificationType.TIMESHEET_SUBMITTED, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(approverUserId, NotificationType.TIMESHEET_SUBMITTED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(approverUserId);
      if (!recipient?.email) return;
      const timesheetUrl = await this.buildTimesheetUrl(projectPublicId, weekStartIso);
      this.emailService
        .sendTimesheetSubmittedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          submitterName,
          projectName,
          weekStart: weekStartIso,
          timesheetUrl,
        })
        .catch(() => {});
    }
  }

  /** Disparada quando a semana de um user fica totalmente APPROVED. */
  async createTimesheetApprovedNotification(
    submitterUserId: number,
    approverName: string,
    projectName: string,
    projectPublicId: string,
    weekStartIso: string,
  ): Promise<void> {
    if (await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_APPROVED, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_APPROVED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(submitterUserId);
      if (!recipient?.email) return;
      const timesheetUrl = await this.buildTimesheetUrl(projectPublicId, weekStartIso);
      this.emailService
        .sendTimesheetApprovedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          approverName,
          projectName,
          weekStart: weekStartIso,
          timesheetUrl,
        })
        .catch(() => {});
    }
  }

  /** Disparada quando a semana de um user passa a PARTIAL. */
  async createTimesheetPartiallyApprovedNotification(
    submitterUserId: number,
    approverName: string,
    projectName: string,
    projectPublicId: string,
    weekStartIso: string,
  ): Promise<void> {
    if (await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_PARTIALLY_APPROVED, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_PARTIALLY_APPROVED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(submitterUserId);
      if (!recipient?.email) return;
      const timesheetUrl = await this.buildTimesheetUrl(projectPublicId, weekStartIso);
      this.emailService
        .sendTimesheetPartiallyApprovedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          approverName,
          projectName,
          weekStart: weekStartIso,
          timesheetUrl,
        })
        .catch(() => {});
    }
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
    if (await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_REJECTED, NotificationChannel.IN_APP)) {
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

    if (await this.shouldNotify(submitterUserId, NotificationType.TIMESHEET_REJECTED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(submitterUserId);
      if (!recipient?.email) return;
      const timesheetUrl = await this.buildTimesheetUrl(projectPublicId, scopeDateIso);
      this.emailService
        .sendTimesheetRejectedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          approverName,
          projectName,
          scopeDate: scopeDateIso,
          reason,
          timesheetUrl,
        })
        .catch(() => {});
    }
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

  /**
   * Notifica o uploader que um ficheiro foi marcado como infectado pelo
   * AWS GuardDuty Malware Protection. Sem `entityPublicId`/`projectPublicId`
   * — o file está soft-removível mas o registo persiste para audit; a UI
   * resolve a navegação a partir de `body` (nome do ficheiro).
   *
   * Sem CTA actionable: não há nada que o user possa fazer, o ficheiro
   * já foi removido. É notificação de segurança, fire-and-forget.
   */
  async createFileInfectedNotification(
    userId: number,
    args: { filePublicId: string; originalName: string },
  ): Promise<void> {
    if (await this.shouldNotify(userId, NotificationType.FILE_INFECTED, NotificationChannel.IN_APP)) {
      await this.prisma.notification.create({
        data: {
          userId,
          type: NotificationType.FILE_INFECTED,
          title: 'Ficheiro bloqueado por motivos de segurança',
          body: args.originalName,
          entityPublicId: args.filePublicId,
        },
      });
    }

    if (await this.shouldNotify(userId, NotificationType.FILE_INFECTED, NotificationChannel.EMAIL)) {
      const recipient = await this.resolveRecipient(userId);
      if (!recipient?.email) return;
      this.emailService
        .sendFileInfectedEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          locale: recipient.locale,
          fileName: args.originalName,
        })
        .catch(() => {});
    }
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
