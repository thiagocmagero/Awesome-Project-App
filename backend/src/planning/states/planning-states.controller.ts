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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProjectPermissionGuard } from '../../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../../projects/project-permissions';
import { StatesService } from './states.service';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';
import { DeleteBoardColumnDto } from './dto/delete-board-column.dto';

/**
 * PlanningStatesController — CRUD de Estados (colunas do projecto).
 *
 * Não depende de feature flag: o estado da tarefa é um conceito do Planning.
 * Internamente delega ao `StatesService` — a tabela DB continua a chamar-se
 * `BoardColumn`, apenas a terminologia externa mudou para "Estado". Quando
 * o futuro componente Board voltar (ver `docs/claude/future-board.md`),
 * adicionar uma flag dedicada apenas ao tab visual e manter este controller
 * sem flag.
 */
@Controller('projects/:id/planning/states')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class PlanningStatesController {
  constructor(private readonly board: StatesService) {}

  @Get()
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  list(@Param('id', ParseUUIDPipe) projectPublicId: string) {
    return this.board.listStates(projectPublicId);
  }

  @Post()
  @RequireProjectPermission(ProjectAction.STATE_MANAGE)
  create(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Body() dto: CreateBoardColumnDto,
  ) {
    return this.board.createColumn(projectPublicId, dto);
  }

  @Patch('reorder')
  @RequireProjectPermission(ProjectAction.STATE_MANAGE)
  reorder(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.board.reorderColumns(projectPublicId, dto);
  }

  @Patch(':stateId')
  @RequireProjectPermission(ProjectAction.STATE_MANAGE)
  update(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('stateId', ParseUUIDPipe) statePublicId: string,
    @Body() dto: UpdateBoardColumnDto,
  ) {
    return this.board.updateColumn(projectPublicId, statePublicId, dto);
  }

  @Delete(':stateId')
  @RequireProjectPermission(ProjectAction.STATE_MANAGE)
  remove(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('stateId', ParseUUIDPipe) statePublicId: string,
    @Body() dto: DeleteBoardColumnDto,
  ) {
    return this.board.deleteColumn(projectPublicId, statePublicId, dto);
  }
}
