import { Module } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { HolidaysController } from './holidays.controller';
import { UsageModule } from '../usage/usage.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [UsageModule, FeatureFlagsModule],
  providers: [HolidaysService],
  controllers: [HolidaysController],
  exports: [HolidaysService],
})
export class HolidaysModule {}
