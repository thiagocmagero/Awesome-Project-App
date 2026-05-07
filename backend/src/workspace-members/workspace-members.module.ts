import { Module } from '@nestjs/common';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceMembersService } from './workspace-members.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Phase 6 — module for workspace-level membership management. Exposes the
 * `/api/workspace-members` REST surface used by the new `/settings/users` UI.
 *
 * Reuses `EmailTokenService` (from AuthModule) for ACCOUNT_INVITE tokens.
 */
@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [WorkspaceMembersController],
  providers: [WorkspaceMembersService],
  exports: [WorkspaceMembersService],
})
export class WorkspaceMembersModule {}
