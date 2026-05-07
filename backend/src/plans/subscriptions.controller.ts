import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  /**
   * Devolve a subscrição do utilizador autenticado (sem IDs internos).
   * `null` se nunca foi criada — caller deve interpretar como "sem plano".
   */
  @Get('me')
  async getMine(@CurrentUser() user: JwtPayload) {
    const sub = await this.subscriptions.getActiveSubscriptionForUser(user.sub);
    if (!sub) return null;

    return {
      publicId: sub.publicId,
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      canceledAt: sub.canceledAt,
      extraSeats: sub.extraSeats,
      hasActiveAccess: this.subscriptions.hasActiveAccess(sub),
      plan: {
        publicId: sub.plan.publicId,
        code: sub.plan.code,
        name: sub.plan.name,
      },
    };
  }
}
