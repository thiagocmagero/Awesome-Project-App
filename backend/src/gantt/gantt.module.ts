import { Module } from '@nestjs/common';
import { GanttService } from './gantt.service';
import { GanttController } from './gantt.controller';
import { PlanningModule } from '../planning/planning.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [PlanningModule, FeatureFlagsModule, ProjectsModule],
  providers: [GanttService],
  controllers: [GanttController],
})
export class GanttModule {}
