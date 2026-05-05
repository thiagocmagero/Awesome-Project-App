import { Module } from '@nestjs/common';
import { GanttConfigController } from './gantt-config.controller';
import { GanttConfigService } from './gantt-config.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [GanttConfigController],
  providers: [GanttConfigService],
  exports: [GanttConfigService],
})
export class GanttConfigModule {}
