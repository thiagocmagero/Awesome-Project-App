import { Module } from '@nestjs/common';
import { PlatformConfigService } from './platform-config.service';
import { PlatformConfigController } from './platform-config.controller';

@Module({
  providers: [PlatformConfigService],
  controllers: [PlatformConfigController],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
