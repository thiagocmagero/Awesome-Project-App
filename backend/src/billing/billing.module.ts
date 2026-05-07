import { Module } from '@nestjs/common';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeEventsService } from './stripe-events.service';
import { PlansModule } from '../plans/plans.module';

/**
 * Phase 8 — Billing scaffolding.
 *
 * Estrutura para integração futura com Stripe. Nesta fase contém apenas
 * stubs e o webhook controller. Nenhum behaviour change face a Phase 7.
 *
 * Para activar Stripe (futuro):
 * 1. Set `STRIPE_ENABLED=true` no `.env`.
 * 2. Set `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`.
 * 3. `npm install stripe` no container backend.
 * 4. Implementar handlers em `stripe-events.service.ts`.
 * 5. Configurar raw body parsing no `main.ts` para a rota webhook.
 */
@Module({
  imports: [PlansModule],
  controllers: [StripeWebhookController],
  providers: [StripeEventsService],
  exports: [StripeEventsService],
})
export class BillingModule {}
