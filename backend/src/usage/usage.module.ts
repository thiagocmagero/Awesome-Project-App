import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [PlansModule],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
