import { Module } from '@nestjs/common';
import { CalendarConfigController } from './calendar-config.controller';
import { CalendarConfigService } from './calendar-config.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [CalendarConfigController],
  providers: [CalendarConfigService],
  exports: [CalendarConfigService],
})
export class CalendarConfigModule {}
