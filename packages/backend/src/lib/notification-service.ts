import type { Notification } from '../generated/prisma';
import { prisma } from './prisma';
import { assertUuid } from './request-user';

function serializeNotification(notification: Notification) {
  return {
    id: notification.id,
    recipientId: notification.recipientId,
    actorId: notification.actorId,
    groupId: notification.groupId,
    ingredientId: notification.ingredientId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    metadata: notification.metadata,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString()
  };
}

export async function listUserNotifications(profileId: string) {
  assertUuid(profileId, 'authenticated user id');

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: profileId },
      orderBy: { createdAt: 'desc' },
      take: 40
    }),
    prisma.notification.count({
      where: { recipientId: profileId, readAt: null }
    })
  ]);

  return {
    unreadCount,
    notifications: notifications.map(serializeNotification)
  };
}

export async function markUserNotificationsRead(profileId: string) {
  assertUuid(profileId, 'authenticated user id');

  const result = await prisma.notification.updateMany({
    where: { recipientId: profileId, readAt: null },
    data: { readAt: new Date() }
  });

  return {
    unreadCount: 0,
    readCount: result.count
  };
}
