import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { WorkspaceMembersService } from './workspace-members.service';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { UpdateWorkspaceMemberDto } from './dto/update-workspace-member.dto';
import { SetWorkspaceMemberProjectsDto } from './dto/set-projects.dto';

/**
 * Phase 6 — gestão centralizada de membros do workspace (UI inspirada em Azure DevOps).
 * O workspace é implícito = projectos do utilizador autenticado (owner).
 * Convites passam de project-scoped para workspace-scoped.
 */
@Controller('workspace-members')
@UseGuards(JwtAuthGuard)
export class WorkspaceMembersController {
  constructor(private readonly service: WorkspaceMembersService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.listMembers(user.sub);
  }

  @Get('seats')
  seats(@CurrentUser() user: JwtPayload) {
    return this.service.listSeatsSummary(user.sub);
  }

  @Post()
  invite(@CurrentUser() user: JwtPayload, @Body() dto: InviteWorkspaceMemberDto) {
    return this.service.inviteMember(user.sub, dto);
  }

  @Patch(':publicId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() dto: UpdateWorkspaceMemberDto,
  ) {
    return this.service.updateMemberType(user.sub, publicId, dto);
  }

  @Delete(':publicId')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('publicId', ParseUUIDPipe) publicId: string,
  ) {
    return this.service.removeMember(user.sub, publicId);
  }

  @Post(':publicId/resend-invite')
  resend(
    @CurrentUser() user: JwtPayload,
    @Param('publicId', ParseUUIDPipe) publicId: string,
  ) {
    return this.service.resendInvite(user.sub, publicId);
  }

  @Get(':publicId/projects')
  getProjects(
    @CurrentUser() user: JwtPayload,
    @Param('publicId', ParseUUIDPipe) publicId: string,
  ) {
    return this.service.getMemberProjects(user.sub, publicId);
  }

  @Patch(':publicId/projects')
  setProjects(
    @CurrentUser() user: JwtPayload,
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() dto: SetWorkspaceMemberProjectsDto,
  ) {
    return this.service.setMemberProjects(user.sub, publicId, dto);
  }
}
