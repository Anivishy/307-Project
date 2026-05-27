import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listUserNotifications,
  markUserNotificationsRead
} from './notification-service';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn()
    }
  }
}));

vi.mock('./prisma', () => ({
  prisma: prismaMock
}));

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';
const NOTIFICATION_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const INGREDIENT_ID = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-05-26T18:30:00.000Z');

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists recent notifications with an unread count', async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: NOTIFICATION_ID,
        recipientId: PROFILE_ID,
        actorId: null,
        groupId: GROUP_ID,
        ingredientId: INGREDIENT_ID,
        type: 'INGREDIENT_ADDED',
        title: 'Avery Cook added Tomatoes',
        message:
          'Avery Cook added Tomatoes (4 whole) to Dorm Dinner Crew.',
        metadata: { ingredientName: 'Tomatoes' },
        readAt: null,
        createdAt: now
      }
    ]);
    prismaMock.notification.count.mockResolvedValue(1);

    await expect(
      listUserNotifications(PROFILE_ID)
    ).resolves.toEqual({
      unreadCount: 1,
      notifications: [
        expect.objectContaining({
          id: NOTIFICATION_ID,
          type: 'INGREDIENT_ADDED',
          readAt: null,
          createdAt: now.toISOString()
        })
      ]
    });
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
      where: { recipientId: PROFILE_ID },
      orderBy: { createdAt: 'desc' },
      take: 40
    });
  });

  it('marks unread notifications as read for the viewer', async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 2 });

    await expect(
      markUserNotificationsRead(PROFILE_ID)
    ).resolves.toEqual({
      unreadCount: 0,
      readCount: 2
    });
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { recipientId: PROFILE_ID, readAt: null },
      data: { readAt: expect.any(Date) }
    });
  });
});
