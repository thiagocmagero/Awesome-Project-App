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
import { PlanLimitGuard } from '../auth/guards/plan-limit.guard';
import { CheckPlanLimit } from '../auth/decorators/check-plan-limit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ── Teams ───────────────────────────────────────────────────────────────────

  /** Lista equipas — PLATFORM_ADMIN: todas; BASIC_USER: apenas as suas */
  @Get()
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.teamsService.findAll(currentUser);
  }

  /** Detalhe — validação de ownership no service */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.teamsService.findOne(id, currentUser);
  }

  /** Cria equipa — autenticados; ownerId definido no service */
  @Post()
  @UseGuards(PlanLimitGuard)
  @CheckPlanLimit('max_teams')
  create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.teamsService.create(dto, currentUser);
  }

  /** Atualiza equipa — validação de ownership no service */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.teamsService.update(id, dto, currentUser);
  }

  /** Soft delete — validação de ownership no service */
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.teamsService.remove(id, currentUser);
  }

  // ── Members ─────────────────────────────────────────────────────────────────

  /** Adiciona membro — valida ownership da equipa e do workspace */
  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.teamsService.addMember(id, dto, currentUser);
  }

  /** Atualiza membro (isLead, role) — valida ownership da equipa */
  @Patch(':id/members/:userId')
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.teamsService.updateMember(id, userId, dto, currentUser);
  }

  /** Remove membro — valida ownership da equipa */
  @Delete(':id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.teamsService.removeMember(id, userId, currentUser);
  }
}
