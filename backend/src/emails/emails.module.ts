import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Módulo global — expõe o `EmailService` a qualquer outro módulo sem
 * necessidade de importar explicitamente `EmailsModule` em cada
 * `imports: [...]`. Templates e config interna ficam encapsulados aqui.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailsModule {}
