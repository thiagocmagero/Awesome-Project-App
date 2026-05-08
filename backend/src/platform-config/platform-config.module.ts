import { Module } from '@nestjs/common';
import { PlatformConfigService } from './platform-config.service';
import { PlatformConfigController } from './platform-config.controller';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  // FeatureFlagsModule injecta o `FeatureFlagsService` que o controller usa
  // no endpoint `/uploads/availability` (gate da UI dos uploads — flag
  // `upload` resolvida pelo plano do user autenticado).
  imports: [FeatureFlagsModule],
  providers: [PlatformConfigService],
  controllers: [PlatformConfigController],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
