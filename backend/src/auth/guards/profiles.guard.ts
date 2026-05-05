import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PROFILES_KEY } from '../decorators/require-profiles.decorator';

@Injectable()
export class ProfilesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredProfiles = this.reflector.getAllAndOverride<string[]>(PROFILES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No profile restriction — allow all authenticated users
    if (!requiredProfiles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: { profileCode?: string } }>();

    if (!user?.profileCode || !requiredProfiles.includes(user.profileCode)) {
      throw new ForbiddenException('Perfil sem permissão para aceder a este recurso.');
    }

    return true;
  }
}
