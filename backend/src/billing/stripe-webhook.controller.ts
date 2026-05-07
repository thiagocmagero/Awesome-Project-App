import { Body, Controller, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipCsrf } from '../common/csrf/skip-csrf.decorator';
import { StripeEventsService } from './stripe-events.service';

/**
 * Phase 8 — endpoint para webhooks Stripe.
 *
 * Em scaffolding: regista o evento e devolve 200. NÃO tem ainda:
 *   - Verificação de assinatura (`stripe.webhooks.constructEvent`)
 *   - Raw body parsing (precisa de configuração no `main.ts`)
 *   - SDK Stripe instalado
 *
 * Quando integrarmos Stripe:
 * 1. `npm install stripe`
 * 2. Em `main.ts`: usar `bodyParser: false` para esta rota e instalar parser raw.
 * 3. Aqui: validar `Stripe-Signature` header com `STRIPE_WEBHOOK_SECRET`.
 * 4. Cada `case` no switch chama o handler específico.
 *
 * Habilitado via env var `STRIPE_ENABLED=true`. Em scaffolding mantemos sempre
 * registado para que ngrok+CLI possam testar mesmo sem implementação completa.
 */
@SkipCsrf()
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly events: StripeEventsService,
    private readonly config: ConfigService,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Body() body: { type?: string; data?: { object?: unknown } },
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const enabled = this.config.get<string>('STRIPE_ENABLED') === 'true';
    if (!enabled) {
      this.logger.warn('Stripe webhook hit but STRIPE_ENABLED=false — ignoring.');
      return { received: true };
    }

    // TODO Stripe: validar signature com STRIPE_WEBHOOK_SECRET via stripe.webhooks.constructEvent
    void signature;

    const eventType = body?.type ?? 'unknown';
    this.logger.log(`Stripe event received: ${eventType}`);

    try {
      switch (eventType) {
        case 'checkout.session.completed':
          await this.events.onCheckoutSessionCompleted(body.data?.object);
          break;
        case 'customer.subscription.updated':
          await this.events.onCustomerSubscriptionUpdated(body.data?.object);
          break;
        case 'customer.subscription.deleted':
          await this.events.onCustomerSubscriptionDeleted(body.data?.object);
          break;
        case 'invoice.paid':
          await this.events.onInvoicePaid(body.data?.object);
          break;
        case 'invoice.payment_failed':
          await this.events.onInvoicePaymentFailed(body.data?.object);
          break;
        default:
          this.logger.debug(`Stripe event type unhandled: ${eventType}`);
      }
    } catch (err) {
      this.logger.error(`Stripe handler error for ${eventType}`, err as Error);
      // Em produção, devolver 500 força Stripe a retentar. Para scaffolding
      // mantemos 200 (HttpCode acima) — handlers são no-ops e não falham.
    }

    return { received: true };
  }
}
