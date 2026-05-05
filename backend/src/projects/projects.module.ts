import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectPermissionsService } from './project-permissions.service';
import { ProjectPermissionsController } from './project-permissions.controller';
import { ProjectPermissionGuard } from './guards/project-permission.guard';
import { UsageModule } from '../usage/usage.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UsageModule, HolidaysModule, NotificationsModule],
  providers: [ProjectsService, ProjectPermissionsService, ProjectPermissionGuard],
  controllers: [ProjectsController, ProjectPermissionsController],
  exports: [ProjectsService, ProjectPermissionsService, ProjectPermissionGuard],
})
export class ProjectsModule {}
