import { Module } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { PlanningController } from './planning.controller';
import { PlanningStatesController } from './states/planning-states.controller';
import { PlanningSwimlanesController } from './states/planning-swimlanes.controller';
import { StatesService } from './states/states.service';
import { HolidaysModule } from '../holidays/holidays.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';

@Module({
  imports: [HolidaysModule, NotificationsModule, ProjectsModule, PlatformConfigModule],
  controllers: [PlanningController, PlanningStatesController, PlanningSwimlanesController],
  providers: [PlanningService, StatesService],
  exports: [PlanningService, StatesService],
})
export class PlanningModule {}
