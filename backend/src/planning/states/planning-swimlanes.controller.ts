import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProjectPermissionGuard } from '../../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../../projects/project-permissions';
import { StatesService } from './states.service';
import { CreateBoardSwimlaneDto } from './dto/create-board-swimlane.dto';
import { UpdateBoardSwimlaneDto } from './dto/update-board-swimlane.dto';
import { ReorderSwimlanesDto } from './dto/reorder-swimlanes.dto';
import { ToggleSwimlaneCollapsedDto } from './dto/toggle-swimlane-collapsed.dto';
import type { JwtPayload } from '../../auth/jwt.strategy';

/**
 * PlanningSwimlanesController — CRUD de Swimlanes (rows do board).
 *
 * Reutiliza a permissão `STATE_MANAGE` (conceptualmente "estrutura do board"
 * abrange colunas + swimlanes). Endpoint de collapsed/expanded é per-user e
 * requer apenas `PROJECT_VIEW` (Abril 2026 — antes era `BOARD_VIEW`, removida).
 *
 * Não depende de feature flag — o conceito de swimlane é estrutural, ficou em
 * standby até o futuro componente Board voltar.
 */
@Controller('projects/:id/planning/swimlanes')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class PlanningSwimlanesController {
  constructor(private readonly board: StatesService) {}

  @Get()
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  list(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Req() req: { user: JwtPayload },
  ) {
    return this.board.listSwimlanes(projectPublicId, req.user.sub);
  }

  @Post()
  @RequireProjectPermission(ProjectAction.STATE_MANAGE)
  create(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Body() dto: CreateBoardSwimlaneDto,
  ) {
    return this.board.createSwimlane(projectPublicId, dto);
  }

  @Patch('reorder')
  @RequireProjectPermission(ProjectAction.STATE_MANAGE)
  reorder(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Body() dto: ReorderSwimlanesDto,
  ) {
    return this.board.reorderSwimlanes(projectPublicId, dto);
  }

  @Patch(':swimlaneId/collapsed')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  setCollapsed(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('swimlaneId', ParseUUIDPipe) swimlanePublicId: string,
    @Body() dto: ToggleSwimlaneCollapsedDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.board.setSwimlaneCollapsed(
      projectPublicId,
      swimlanePublicId,
      req.user.sub,
      dto.collapsed,
    );
  }

  @Patch(':swimlaneId')
  @RequireProjectPermission(ProjectAction.STATE_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('swimlaneId', ParseUUIDPipe) swimlanePublicId: string,
    @Body() dto: UpdateBoardSwimlaneDto,
  ) {
    return this.board.updateSwimlane(projectPublicId, swimlanePublicId, dto);
  }

  @Delete(':swimlaneId')
  @RequireProjectPermission(ProjectAction.STATE_MANAGE)
  remove(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('swimlaneId', ParseUUIDPipe) swimlanePublicId: string,
  ) {
    return this.board.deleteSwimlane(projectPublicId, swimlanePublicId);
  }
}
