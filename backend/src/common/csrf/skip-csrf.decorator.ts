import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

/** Isenta uma rota ou controller da verificação CSRF (ex: login, register, webhooks). */
export const SkipCsrf = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_CSRF_KEY, true);
