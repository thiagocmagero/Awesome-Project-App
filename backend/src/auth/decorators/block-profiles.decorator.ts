import { SetMetadata } from '@nestjs/common';

export const BLOCK_PROFILES_KEY = 'block_profiles';

/**
 * Blocks access for users with any of the specified profile codes.
 * Semantic inverse of @RequireProfiles.
 * Must be used together with JwtAuthGuard + BlockProfilesGuard.
 *
 * @example
 * @UseGuards(JwtAuthGuard, BlockProfilesGuard)
 * @BlockProfiles('PLATFORM_ADMIN')
 */
export const BlockProfiles = (...profiles: string[]) =>
  SetMetadata(BLOCK_PROFILES_KEY, profiles);
