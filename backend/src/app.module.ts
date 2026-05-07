import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { validateEnv } from './common/config/env.validation';
import { CsrfGuard } from './common/csrf/csrf.guard';
import { SessionActivityInterceptor } from './auth/session-activity.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { UserTypesModule } from './user-types/user-types.module';
import { UserLevelsModule } from './user-levels/user-levels.module';
import { TeamsModule } from './teams/teams.module';
import { ProjectsModule } from './projects/projects.module';
import { InvitationsModule } from './invitations/invitations.module';
import { PlatformConfigModule } from './platform-config/platform-config.module';
import { PlanningModule } from './planning/planning.module';
import { GanttModule } from './gantt/gantt.module';
import { HolidaysModule } from './holidays/holidays.module';
import { PlansModule } from './plans/plans.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { UsageModule } from './usage/usage.module';
import { GanttConfigModule } from './gantt-config/gantt-config.module';
import { CalendarModule } from './calendar/calendar.module';
import { CalendarConfigModule } from './calendar-config/calendar-config.module';
import { BoardConfigModule } from './board-config/board-config.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommentsModule } from './comments/comments.module';
import { EmailsModule } from './emails/emails.module';
import { StorageModule } from './storage/storage.module';
import { I18nModule } from './i18n/i18n.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([
      // Limite global generoso — previne abuse mas não incomoda uso normal da SPA.
      // Limites apertados ficam em endpoints específicos via @Throttle (login, register).
      { name: 'default', ttl: 60_000, limit: 300 },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    UserTypesModule,
    UserLevelsModule,
    TeamsModule,
    ProjectsModule,
    InvitationsModule,
    PlatformConfigModule,
    PlanningModule,
    GanttModule,
    HolidaysModule,
    PlansModule,
    FeatureFlagsModule,
    UsageModule,
    GanttConfigModule,
    CalendarModule,
    CalendarConfigModule,
    BoardConfigModule,
    TimesheetModule,
    NotificationsModule,
    CommentsModule,
    EmailsModule,
    StorageModule,
    I18nModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_INTERCEPTOR, useClass: SessionActivityInterceptor },
  ],
})
export class AppModule {}
