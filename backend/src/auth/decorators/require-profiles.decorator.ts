import { SetMetadata } from '@nestjs/common';

export const PROFILES_KEY = 'profiles';

/**
 * Marks a route as requiring one of the specified profile codes.
 * Must be used together with JwtAuthGuard + ProfilesGuard.
 *
 * @example
 * @UseGuards(JwtAuthGuard, ProfilesGuard)
 * @RequireProfiles('PLATFORM_ADMIN')
 */
export const RequireProfiles = (...profiles: string[]) =>
  SetMetadata(PROFILES_KEY, profiles);
