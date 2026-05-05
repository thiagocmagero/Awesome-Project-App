import { Module } from '@nestjs/common';
import { TimesheetController } from './timesheet.controller';
import { TimesheetGlobalController } from './timesheet-global.controller';
import { TimesheetService } from './timesheet.service';
import { ProjectsModule } from '../projects/projects.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ProjectsModule, FeatureFlagsModule, NotificationsModule],
  controllers: [TimesheetController, TimesheetGlobalController],
  providers: [TimesheetService],
  exports: [TimesheetService],
})
export class TimesheetModule {}
