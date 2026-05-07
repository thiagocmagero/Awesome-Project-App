import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, SubscriptionsService],
  /** Exporta SubscriptionsService — Phase 5 vai consumi-lo em FeatureFlagsModule
   *  e UsageModule para resolução context-aware. */
  exports: [PlansService, SubscriptionsService],
})
export class PlansModule {}
