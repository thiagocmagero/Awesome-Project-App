import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlockProfilesGuard } from '../auth/guards/block-profiles.guard';
import { BlockProfiles } from '../auth/decorators/block-profiles.decorator';
import { FeatureFlagGuard } from '../auth/guards/feature-flag.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../projects/project-permissions';
import { GanttService } from './gantt.service';
import { FeatureKey } from '../common/entitlements';

@Controller('projects/:projectId/planning')
@UseGuards(JwtAuthGuard, BlockProfilesGuard, FeatureFlagGuard, ProjectPermissionGuard)
@BlockProfiles('PLATFORM_ADMIN')
@RequireFeature(FeatureKey.GANTT_VIEW)
export class GanttController {
  constructor(private readonly ganttService: GanttService) {}

  /** Retorna { data: Task[], links: TaskLink[] } no formato DHTMLX */
  @Get('gantt')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  getProjectData(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.ganttService.getProjectData(projectId);
  }
}
