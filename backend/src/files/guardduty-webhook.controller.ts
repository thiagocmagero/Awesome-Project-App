import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Headers,
} from '@nestjs/common';
import { SkipCsrf } from '../common/csrf/skip-csrf.decorator';
import { FilesService } from './files.service';
import {
  parseGuardDutyVerdict,
  verifySnsSignature,
} from './guardduty-sns-verifier';

/**
 * Webhook para resultados do AWS GuardDuty Malware Protection. Fluxo:
 *
 *   GuardDuty → EventBridge → SNS Topic → POST /api/webhooks/guardduty
 *
 * O payload é um SNS HTTPS notification (envelope), com `Message` contendo
 * o JSON do EventBridge (`detail.scanResultDetails.scanResultStatus` etc.).
 *
 * Segurança: rota pública (sem JWT), sem CSRF, mas com verificação de
 * assinatura SNS + validação do `SigningCertURL` (`*.amazonaws.com`).
 *
 * O endpoint trata 2 tipos de mensagem:
 * - `Notification`: scan result — chamamos `FilesService.recordScanResult`.
 * - `SubscriptionConfirmation`: SNS pede confirmação da subscrição — fazemos
 *   GET ao `SubscribeURL` (idempotente) para confirmar.
 *
 * Resposta sempre 200 — SNS reentregaria de outra forma; melhor logar e ack
 * do que reentregar payloads malformados em loop.
 */
@Controller('webhooks')
export class GuardDutyWebhookController {
  private readonly logger = new Logger(GuardDutyWebhookController.name);

  constructor(private readonly files: FilesService) {}

  @Post('guardduty')
  @SkipCsrf()
  @HttpCode(200)
  async handle(
    @Body() body: any,
    @Headers('x-amz-sns-message-type') snsType?: string,
  ): Promise<{ ok: boolean }> {
    if (!body || typeof body !== 'object') {
      this.logger.warn('GuardDuty webhook received empty body — ignored.');
      return { ok: true };
    }

    // Validação de assinatura SNS — defesa contra spoofing.
    const verified = await verifySnsSignature(body);
    if (!verified) {
      this.logger.warn(
        `GuardDuty webhook rejected — SNS signature failed (Type=${body?.Type}, MessageId=${body?.MessageId})`,
      );
      // Devolvemos 200 mesmo assim para não revelar a causa ao atacante.
      return { ok: true };
    }

    const messageType = body.Type ?? snsType;
    if (messageType === 'SubscriptionConfirmation' && body.SubscribeURL) {
      // Confirmar subscrição automaticamente via GET. Idempotente.
      try {
        await fetch(body.SubscribeURL);
        this.logger.log(`SNS subscription confirmed (TopicArn=${body.TopicArn})`);
      } catch (err) {
        this.logger.warn(`SNS subscription confirm failed: ${(err as Error).message}`);
      }
      return { ok: true };
    }

    if (messageType !== 'Notification') {
      this.logger.warn(`GuardDuty webhook unexpected Type=${messageType} — ignored.`);
      return { ok: true };
    }

    const verdict = parseGuardDutyVerdict(body.Message ?? '');
    if (!verdict) {
      this.logger.warn(
        `GuardDuty notification without parseable verdict (MessageId=${body.MessageId}) — ignored.`,
      );
      return { ok: true };
    }

    await this.files.recordScanResult(verdict.bucketKey, verdict.verdict);
    this.logger.log(
      `GuardDuty scan result applied: ${verdict.verdict} for ${verdict.bucketKey}`,
    );
    return { ok: true };
  }
}
