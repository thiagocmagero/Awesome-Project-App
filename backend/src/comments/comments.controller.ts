import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { JwtPayload } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { EntityType } from '@prisma/client';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../projects/project-permissions';

@Controller('projects/:projectId/comments')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly prisma: PrismaService,
  ) {}

  private async getCtx(req: { user: JwtPayload }) {
    const userId = req.user.sub;
    const isAdmin = req.user.profileCode === 'PLATFORM_ADMIN';
    return { userId, isAdmin };
  }

  private async getActorName(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name ?? 'Alguém';
  }

  @Get()
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  listComments(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('entityType') entityType: EntityType,
    @Query('entityPublicId') entityPublicId: string,
    @Req() req: { user: JwtPayload },
  ) {
    const ctx = { userId: req.user.sub, isAdmin: req.user.profileCode === 'PLATFORM_ADMIN' };
    return this.commentsService.listComments(projectId, entityType, entityPublicId, ctx);
  }

  @Get('mentionables')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  async getMentionables(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    // Resolve numeric projectId for lookup
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectId },
      select: { id: true },
    });
    if (!project) return [];
    return this.commentsService.getMentionables(project.id);
  }

  @Post()
  @RequireProjectPermission(ProjectAction.TASK_COMMENT)
  async createComment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: { user: JwtPayload },
  ) {
    const ctx = await this.getCtx(req);
    const actorName = await this.getActorName(ctx.userId);
    return this.commentsService.createComment(projectId, dto, ctx, actorName);
  }

  @Patch(':commentId')
  @RequireProjectPermission(ProjectAction.TASK_COMMENT)
  async updateComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: { user: JwtPayload },
  ) {
    const ctx = await this.getCtx(req);
    const actorName = await this.getActorName(ctx.userId);
    return this.commentsService.updateComment(commentId, dto, ctx, actorName);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireProjectPermission(ProjectAction.TASK_COMMENT)
  async deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Req() req: { user: JwtPayload },
  ) {
    const ctx = await this.getCtx(req);
    await this.commentsService.deleteComment(commentId, ctx);
  }

  @Post(':commentId/reactions')
  @RequireProjectPermission(ProjectAction.TASK_COMMENT)
  async toggleReaction(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: ToggleReactionDto,
    @Req() req: { user: JwtPayload },
  ) {
    const ctx = { userId: req.user.sub, isAdmin: req.user.profileCode === 'PLATFORM_ADMIN' };
    const actorName = await this.getActorName(ctx.userId);
    return this.commentsService.toggleReaction(commentId, dto.emoji, ctx, actorName);
  }
}
