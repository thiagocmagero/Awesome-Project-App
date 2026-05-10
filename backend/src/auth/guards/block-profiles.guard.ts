import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BLOCK_PROFILES_KEY } from '../decorators/block-profiles.decorator';

@Injectable()
export class BlockProfilesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const blockedProfiles = this.reflector.getAllAndOverride<string[]>(BLOCK_PROFILES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!blockedProfiles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: { profileCode?: string } }>();

    if (user?.profileCode && blockedProfiles.includes(user.profileCode)) {
      throw new ForbiddenException('PLATFORM_ADMIN_ROUTE_FORBIDDEN');
    }

    return true;
  }
}
