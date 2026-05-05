import { Module } from '@nestjs/common';
import { BoardConfigController } from './board-config.controller';
import { BoardConfigService } from './board-config.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [BoardConfigController],
  providers: [BoardConfigService],
  exports: [BoardConfigService],
})
export class BoardConfigModule {}
