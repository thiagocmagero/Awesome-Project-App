import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Módulo de storage de ficheiros. Marcado como `@Global()` para que qualquer
 * service (UsersService, futuro AttachmentsService, etc.) possa injectar
 * `StorageService` sem ter de importar este módulo explicitamente.
 *
 * Espelha o pattern de `EmailsModule`. Detalhes em @docs/claude/storage.md.
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
