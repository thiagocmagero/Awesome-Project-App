import { Injectable, Logger } from '@nestjs/common';

/**
 * Phase 8 — stubs para handlers de eventos Stripe.
 *
 * Cada método é um no-op que regista o evento. Quando integrarmos Stripe,
 * preencher cada método com o mapeamento documentado nos comentários TODO.
 *
 * Princípios:
 * - Idempotente por `stripeEventId` (Stripe pode enviar o mesmo evento 2x).
 * - Fonte de verdade interna: `Subscription` / `Invoice`. Stripe é eco.
 * - Falhas devem retornar 500 ao Stripe para reentrega; sucessos retornam 200.
 */
@Injectable()
export class StripeEventsService {
  private readonly logger = new Logger(StripeEventsService.name);

  /**
   * `checkout.session.completed`
   *
   * TODO Stripe:
   * - Resolver `userId` via `client_reference_id` (passámos o user.id no checkout).
   * - Stripe customer já criado → guardar `User.stripeCustomerId`.
   * - Subscription criada → upsert `Subscription` com `stripeSubscriptionId`,
   *   `status='ACTIVE'` ou 'TRIALING' conforme `subscription.status`.
   * - `currentPeriodStart`/`currentPeriodEnd` do `subscription.current_period_*`.
   */
  async onCheckoutSessionCompleted(payload: unknown): Promise<void> {
    this.logger.log(`[stub] checkout.session.completed received`);
    void payload;
  }

  /**
   * `customer.subscription.updated`
   *
   * TODO Stripe:
   * - Identificar `Subscription` via `stripeSubscriptionId`.
   * - Sincronizar: `status`, `currentPeriodStart`, `currentPeriodEnd`,
   *   `cancelAtPeriodEnd`, `extraSeats` (de items/quantity), `stripeStatus`.
   * - Mapeamento de status:
   *   trialing→TRIALING, active→ACTIVE, past_due→PAST_DUE,
   *   canceled→CANCELED, unpaid→PAST_DUE, incomplete→INCOMPLETE,
   *   incomplete_expired→CANCELED, paused→PAUSED.
   */
  async onCustomerSubscriptionUpdated(payload: unknown): Promise<void> {
    this.logger.log(`[stub] customer.subscription.updated received`);
    void payload;
  }

  /**
   * `customer.subscription.deleted`
   *
   * TODO Stripe:
   * - Marcar `Subscription.status='CANCELED'`, set `canceledAt=now`.
   * - Acesso preservado até `currentPeriodEnd` (regra `hasActiveAccess`).
   */
  async onCustomerSubscriptionDeleted(payload: unknown): Promise<void> {
    this.logger.log(`[stub] customer.subscription.deleted received`);
    void payload;
  }

  /**
   * `invoice.paid`
   *
   * TODO Stripe:
   * - Criar `Invoice(status=PAID)` com `stripeInvoiceId`, `amount`, `currency`,
   *   `billingPeriodStart/End`, `paidAt=now`, `hostedInvoiceUrl`, `invoicePdf`.
   * - Idempotência: ignorar se já existe `Invoice` com mesmo `stripeInvoiceId`.
   * - Se a `Subscription` correspondente estava `PAST_DUE`, voltar para `ACTIVE`.
   */
  async onInvoicePaid(payload: unknown): Promise<void> {
    this.logger.log(`[stub] invoice.paid received`);
    void payload;
  }

  /**
   * `invoice.payment_failed`
   *
   * TODO Stripe:
   * - Marcar `Subscription.status='PAST_DUE'`.
   * - Notificar owner via `NotificationsService` (template a criar).
   * - Não revogar acesso imediatamente — Stripe faz dunning, eventualmente
   *   `customer.subscription.deleted` se falhar.
   */
  async onInvoicePaymentFailed(payload: unknown): Promise<void> {
    this.logger.log(`[stub] invoice.payment_failed received`);
    void payload;
  }
}
