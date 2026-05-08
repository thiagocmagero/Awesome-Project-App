import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { GuardDutyWebhookController } from './guardduty-webhook.controller';
import { ProjectsModule } from '../projects/projects.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { UsageModule } from '../usage/usage.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * `FilesModule` agrupa o controller project-scoped (`/api/projects/:id/files`)
 * e o webhook público do GuardDuty (`/api/webhooks/guardduty`).
 *
 * Dependências:
 * - `StorageModule` é `@Global()` — `StorageService` injecta directamente.
 * - `ProjectsModule` para `ProjectPermissionGuard` (acesso ao guard via export).
 * - `FeatureFlagsModule` para `FeatureFlagGuard` + resolução owner-aware via
 *   `FeatureFlagsService.isEnabledForUser`.
 * - `PlatformConfigModule` para caps absolutos (`maxUploadSizeMb`, MIME allowlist).
 * - `UsageModule` para tracking de quota (`max_uploads_count`, `max_storage_mb`).
 * - `NotificationsModule` para `FILE_INFECTED` (fan-out IN_APP + EMAIL).
 */
@Module({
  imports: [
    ProjectsModule,
    FeatureFlagsModule,
    PlatformConfigModule,
    UsageModule,
    NotificationsModule,
  ],
  controllers: [FilesController, GuardDutyWebhookController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
