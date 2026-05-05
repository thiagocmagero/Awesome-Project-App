import { Notification } from '@prisma/client';

export class NotificationResponseDto {
  publicId!: string;
  type!: string;
  title!: string;
  body!: string;
  entityType!: string | null;
  entityPublicId!: string | null;
  projectPublicId!: string | null;
  read!: boolean;
  createdAt!: Date;

  static from(n: Notification): NotificationResponseDto {
    return {
      publicId: n.publicId,
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType ?? null,
      entityPublicId: n.entityPublicId ?? null,
      projectPublicId: n.projectPublicId ?? null,
      read: n.read,
      createdAt: n.createdAt,
    };
  }
}
