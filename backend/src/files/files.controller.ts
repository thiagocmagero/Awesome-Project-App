import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureFlagGuard } from '../auth/guards/feature-flag.guard';
import { PlanLimitGuard } from '../auth/guards/plan-limit.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { CheckPlanLimit } from '../auth/decorators/check-plan-limit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../projects/project-permissions';
import { AppException } from '../common/exceptions/app.exception';

import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { RenameFileDto } from './dto/rename-file.dto';
import { FeatureKey, LimitKey } from '../common/entitlements';

/**
 * Multer hard cap (em bytes). É um upper bound; o cap real é
 * `PlatformLimits.maxUploadSizeMb` (validado no service contra o buffer
 * recebido). Aqui pomos um teto generoso (2 GB) para evitar truncar antes
 * da validação do service. Em produção, recomenda-se baixar este valor
 * para o `maxUploadSizeMb` lido a partir do singleton — mas isso requer
 * factory async no Multer (overkill para Phase 1).
 */
const MULTER_MAX_BYTES = 2 * 1024 * 1024 * 1024;

@Controller('projects/:id/files')
@UseGuards(JwtAuthGuard, FeatureFlagGuard, ProjectPermissionGuard)
@RequireFeature(FeatureKey.UPLOAD, { projectIdFrom: 'params.id' })
export class FilesController {
  constructor(private readonly service: FilesService) {}

  // ── Listagem ────────────────────────────────────────────────────────────────

  @Get()
  @RequireProjectPermission(ProjectAction.FILE_VIEW)
  list(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Query('taskPublicId') taskPublicId?: string,
    @Query('scope') scope?: string,
  ) {
    const normalizedScope = scope === 'project' ? 'project' : 'all';
    return this.service.list(projectPublicId, {
      taskPublicId,
      scope: normalizedScope,
    });
  }

  // ── Upload novo ─────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(PlanLimitGuard)
  @CheckPlanLimit(LimitKey.MAX_UPLOADS_COUNT, { projectIdFrom: 'params.id' })
  @RequireProjectPermission(ProjectAction.FILE_UPLOAD)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MULTER_MAX_BYTES },
    }),
  )
  async upload(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new AppException('FILE_MISSING', HttpStatus.BAD_REQUEST);
    }
    return this.service.upload(projectPublicId, user.sub, file, dto);
  }

  // ── Substituição de conteúdo ────────────────────────────────────────────────

  @Post(':fileId/replace')
  @RequireProjectPermission(ProjectAction.FILE_RENAME)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MULTER_MAX_BYTES },
    }),
  )
  async replace(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new AppException('FILE_MISSING', HttpStatus.BAD_REQUEST);
    }
    return this.service.replace(projectPublicId, fileId, file);
  }

  // ── Download ────────────────────────────────────────────────────────────────

  @Get(':fileId/download')
  @RequireProjectPermission(ProjectAction.FILE_VIEW)
  download(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.service.getDownloadUrl(projectPublicId, fileId);
  }

  // ── Rename ─────────────────────────────────────────────────────────────────

  @Patch(':fileId')
  @RequireProjectPermission(ProjectAction.FILE_RENAME)
  rename(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() dto: RenameFileDto,
  ) {
    return this.service.rename(projectPublicId, fileId, dto);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  @Delete(':fileId')
  @RequireProjectPermission(ProjectAction.FILE_DELETE)
  remove(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.service.remove(projectPublicId, fileId);
  }
}
