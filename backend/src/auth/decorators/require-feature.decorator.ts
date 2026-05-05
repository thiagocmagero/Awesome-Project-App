import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'required_feature';

/**
 * Marks a route as requiring a specific feature flag to be enabled.
 * Must be used together with JwtAuthGuard + FeatureFlagGuard.
 *
 * @example
 * @UseGuards(JwtAuthGuard, FeatureFlagGuard)
 * @RequireFeature('gantt_view')
 */
export const RequireFeature = (featureKey: string) =>
  SetMetadata(FEATURE_FLAG_KEY, featureKey);
