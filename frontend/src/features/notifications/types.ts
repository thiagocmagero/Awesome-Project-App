export const NOTIFICATION_TYPES = [
  'MENTION',
  'TASK_ASSIGNED',
  'INVITATION_RECEIVED',
  'INVITATION_ACCEPTED',
  'INVITATION_DECLINED',
  'COMMENT_REACTION',
  'TIMESHEET_SUBMITTED',
  'TIMESHEET_APPROVED',
  'TIMESHEET_PARTIALLY_APPROVED',
  'TIMESHEET_REJECTED',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL', 'BROWSER'] as const;

export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number];

export interface AppNotification {
  publicId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: 'TASK' | 'PROJECT' | null;
  entityPublicId: string | null;
  projectPublicId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreference {
  publicId: string;
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

/** Opt-out model: missing preference record means enabled. */
export function isEnabled(
  prefs: NotificationPreference[],
  type: NotificationType,
  channel: NotificationChannel,
): boolean {
  return prefs.find((p) => p.type === type && p.channel === channel)?.enabled ?? true;
}
