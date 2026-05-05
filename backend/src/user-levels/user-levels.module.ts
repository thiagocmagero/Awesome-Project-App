import { Module } from '@nestjs/common';
import { UserLevelsService } from './user-levels.service';
import { UserLevelsController } from './user-levels.controller';

@Module({
  providers: [UserLevelsService],
  controllers: [UserLevelsController],
  exports: [UserLevelsService],
})
export class UserLevelsModule {}
