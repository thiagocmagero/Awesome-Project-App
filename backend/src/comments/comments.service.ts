import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { EntityType } from '@prisma/client';

interface AuthCtx {
  userId: number;
  isAdmin: boolean;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async resolveProjectId(projectPublicId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException(`Projeto ${projectPublicId} não encontrado.`);
    return project.id;
  }

  /**
   * Verifica se o utilizador tem acesso ao projecto:
   * - PLATFORM_ADMIN passa sempre
   * - ProjectMember com status ACCEPTED
   * - ownerId ou managerId do projecto
   */
  private async assertProjectAccess(
    projectId: number,
    ctx: AuthCtx,
  ): Promise<void> {
    if (ctx.isAdmin) return;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, managerId: true },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    if (project.ownerId === ctx.userId || project.managerId === ctx.userId) return;

    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId: ctx.userId, status: 'ACCEPTED' },
    });
    if (!member) throw new ForbiddenException('Sem acesso a este projecto.');
  }

  /** Serializa um comentário para a API */
  private serializeComment(comment: any) {
    return {
      publicId: comment.publicId,
      content: comment.content,
      entityType: comment.entityType,
      entityPublicId: comment.entityPublicId,
      editedAt: comment.editedAt,
      createdAt: comment.createdAt,
      author: {
        publicId: comment.author.publicId,
        name: comment.author.name,
      },
      mentions: comment.mentions.map((m: any) => ({
        publicId: m.user.publicId,
        name: m.user.name,
      })),
      reactions: this.groupReactions(comment.reactions),
    };
  }

  /** Agrupa reações por emoji com lista de { publicId, name } */
  private groupReactions(reactions: any[]) {
    const map = new Map<string, { publicId: string; name: string }[]>();
    for (const r of reactions) {
      if (!map.has(r.emoji)) map.set(r.emoji, []);
      map.get(r.emoji)!.push({ publicId: r.user.publicId, name: r.user.name });
    }
    return Array.from(map.entries()).map(([emoji, users]) => ({ emoji, users }));
  }

  // ── Mentionables ────────────────────────────────────────────────────────────

  async getMentionables(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        managerId: true,
        owner: { select: { publicId: true, name: true } },
        manager: { select: { publicId: true, name: true } },
        members: {
          where: { status: 'ACCEPTED', userId: { not: null } },
          select: { user: { select: { publicId: true, name: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const adminUsers = await this.prisma.user.findMany({
      where: { profile: { code: 'PLATFORM_ADMIN' }, status: 'ACTIVE' },
      select: { publicId: true, name: true },
    });

    const seen = new Set<string>();
    const result: { publicId: string; name: string }[] = [];

    const add = (u: { publicId: string; name: string } | null | undefined) => {
      if (!u) return;
      if (seen.has(u.publicId)) return;
      seen.add(u.publicId);
      result.push(u);
    };

    for (const u of adminUsers) add(u);
    add(project.owner);
    add(project.manager);
    for (const m of project.members) add(m.user ?? undefined);

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async listComments(
    projectPublicId: string,
    entityType: EntityType,
    entityPublicId: string,
    ctx: AuthCtx,
  ) {
    const projectId = await this.resolveProjectId(projectPublicId);
    await this.assertProjectAccess(projectId, ctx);

    const comments = await this.prisma.comment.findMany({
      where: { projectId, entityType, entityPublicId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { publicId: true, name: true } },
        mentions: { include: { user: { select: { publicId: true, name: true } } } },
        reactions: { include: { user: { select: { publicId: true, name: true } } } },
      },
    });

    return comments.map((c) => this.serializeComment(c));
  }

  async createComment(
    projectPublicId: string,
    dto: CreateCommentDto,
    ctx: AuthCtx,
    actorName: string,
  ) {
    const projectId = await this.resolveProjectId(projectPublicId);
    await this.assertProjectAccess(projectId, ctx);

    // Resolve mention user publicIds → internal ids
    const mentionedUsers: { publicId: string; id: number; name: string }[] = [];
    if (dto.mentionedUserPublicIds && dto.mentionedUserPublicIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { publicId: { in: dto.mentionedUserPublicIds } },
        select: { id: true, publicId: true, name: true },
      });
      mentionedUsers.push(...users);
    }

    // Get project publicId for notifications
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { publicId: true },
    });

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        entityType: dto.entityType,
        entityPublicId: dto.entityPublicId,
        projectId,
        authorId: ctx.userId,
        mentions: {
          create: mentionedUsers.map((u) => ({ userId: u.id })),
        },
      },
      include: {
        author: { select: { publicId: true, name: true } },
        mentions: { include: { user: { select: { publicId: true, name: true } } } },
        reactions: { include: { user: { select: { publicId: true, name: true } } } },
      },
    });

    // Fire mention notifications (don't await — fire-and-forget)
    for (const mentioned of mentionedUsers) {
      if (mentioned.id === ctx.userId) continue; // don't notify yourself
      const excerpt = dto.content.length > 100
        ? dto.content.slice(0, 97) + '...'
        : dto.content;
      this.notificationsService
        .createMentionNotification(
          actorName,
          mentioned.id,
          project!.publicId,
          dto.entityType,
          dto.entityPublicId,
          excerpt,
        )
        .catch(() => {/* silent */});
    }

    return this.serializeComment(comment);
  }

  async updateComment(
    commentPublicId: string,
    dto: UpdateCommentDto,
    ctx: AuthCtx,
    actorName: string,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { publicId: commentPublicId },
      select: { id: true, authorId: true, projectId: true, entityType: true, entityPublicId: true },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado.');

    if (!ctx.isAdmin && comment.authorId !== ctx.userId) {
      throw new ForbiddenException('Só o autor ou administrador pode editar este comentário.');
    }

    // Resolve new mentions
    const mentionedUsers: { id: number; publicId: string; name: string }[] = [];
    if (dto.mentionedUserPublicIds && dto.mentionedUserPublicIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { publicId: { in: dto.mentionedUserPublicIds } },
        select: { id: true, publicId: true, name: true },
      });
      mentionedUsers.push(...users);
    }

    // Get project publicId for notifications
    const project = await this.prisma.project.findUnique({
      where: { id: comment.projectId },
      select: { publicId: true },
    });

    // Get previous mentions to notify only new ones
    const previousMentions = await this.prisma.commentMention.findMany({
      where: { commentId: comment.id },
      select: { userId: true },
    });
    const previousMentionIds = new Set(previousMentions.map((m) => m.userId));

    // Delete old mentions + recreate
    await this.prisma.commentMention.deleteMany({ where: { commentId: comment.id } });

    const updated = await this.prisma.comment.update({
      where: { id: comment.id },
      data: {
        content: dto.content,
        editedAt: new Date(),
        mentions: {
          create: mentionedUsers.map((u) => ({ userId: u.id })),
        },
      },
      include: {
        author: { select: { publicId: true, name: true } },
        mentions: { include: { user: { select: { publicId: true, name: true } } } },
        reactions: { include: { user: { select: { publicId: true, name: true } } } },
      },
    });

    // Notify new mentions
    for (const mentioned of mentionedUsers) {
      if (previousMentionIds.has(mentioned.id)) continue;
      if (mentioned.id === ctx.userId) continue;
      const excerpt = dto.content.length > 100
        ? dto.content.slice(0, 97) + '...'
        : dto.content;
      this.notificationsService
        .createMentionNotification(
          actorName,
          mentioned.id,
          project!.publicId,
          comment.entityType,
          comment.entityPublicId,
          excerpt,
        )
        .catch(() => {/* silent */});
    }

    return this.serializeComment(updated);
  }

  async deleteComment(commentPublicId: string, ctx: AuthCtx): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { publicId: commentPublicId },
      select: { id: true, authorId: true },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado.');

    if (!ctx.isAdmin && comment.authorId !== ctx.userId) {
      throw new ForbiddenException('Só o autor ou administrador pode eliminar este comentário.');
    }

    // Eliminação física — cascade remove mentions e reactions
    await this.prisma.comment.delete({ where: { id: comment.id } });
  }

  async toggleReaction(
    commentPublicId: string,
    emoji: string,
    ctx: AuthCtx,
    actorName: string,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { publicId: commentPublicId },
      select: { id: true, authorId: true, entityPublicId: true, project: { select: { publicId: true } } },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado.');

    const existing = await this.prisma.commentReaction.findUnique({
      where: { commentId_userId_emoji: { commentId: comment.id, userId: ctx.userId, emoji } },
    });

    if (existing) {
      await this.prisma.commentReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.commentReaction.create({
        data: { commentId: comment.id, userId: ctx.userId, emoji },
      });

      // Notificar o autor (fire-and-forget, não notificar auto-reação)
      if (comment.authorId !== ctx.userId) {
        this.notificationsService
          .createCommentReactionNotification(
            comment.authorId,
            actorName,
            emoji,
            comment.project.publicId,
            comment.entityPublicId,
          )
          .catch(() => {/* silent */});
      }
    }

    // Return updated reactions for this comment
    const reactions = await this.prisma.commentReaction.findMany({
      where: { commentId: comment.id },
      include: { user: { select: { publicId: true, name: true } } },
    });
    return { reactions: this.groupReactions(reactions) };
  }
}
