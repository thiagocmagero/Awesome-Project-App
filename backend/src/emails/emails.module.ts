import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { I18nModule } from '../i18n/i18n.module';

/**
 * Módulo global — expõe o `EmailService` a qualquer outro módulo sem
 * necessidade de importar explicitamente `EmailsModule` em cada
 * `imports: [...]`. Templates e config interna ficam encapsulados aqui.
 *
 * Importa `I18nModule` para resolver chaves do namespace `email` por locale
 * (ver `EmailService.loadEmailBundle`).
 */
@Global()
@Module({
  imports: [I18nModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailsModule {}
