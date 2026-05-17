import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUserGroup,
  joinUserGroup
} from './group-membership-service';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: {
      findUnique: vi.fn()
    },
    group: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock('./prisma', () => ({
  prisma: prismaMock
}));

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-05-14T00:00:00.000Z');

function groupRecord(overrides = {}) {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    ownerId: PROFILE_ID,
    name: 'Study Dinner Crew',
    description: 'New shared pantry group.',
    inviteCode: 'STUDY-ABCD',
    pantrySnapshotVersion: 1,
    activeBundleVersion: 1,
    selectedBundleId: null,
    createdAt: now,
    updatedAt: now,
    members: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        groupId: '22222222-2222-4222-8222-222222222222',
        profileId: PROFILE_ID,
        role: 'ADMIN',
        joinedAt: now
      }
    ],
    ...overrides
  };
}

describe('US2 create or join a group', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.profile.findUnique.mockResolvedValue({ id: PROFILE_ID });
  });

  it('creates a group and stores the creator as admin', async () => {
    prismaMock.group.create.mockResolvedValue(groupRecord());

    const payload = await createUserGroup(PROFILE_ID, {
      name: 'Study Dinner Crew',
      description: 'New shared pantry group.'
    });

    expect(prismaMock.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: PROFILE_ID,
          members: {
            create: {
              profileId: PROFILE_ID,
              role: 'ADMIN'
            }
          }
        })
      })
    );
    expect(payload).toMatchObject({
      name: 'Study Dinner Crew',
      role: 'Admin',
      members: 1
    });
  });

  it('joins by invite code and stores the member role', async () => {
    prismaMock.group.findUnique.mockResolvedValue(
      groupRecord({ members: [] })
    );
    prismaMock.group.update.mockResolvedValue(
      groupRecord({
        members: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            groupId: '22222222-2222-4222-8222-222222222222',
            profileId: PROFILE_ID,
            role: 'MEMBER',
            joinedAt: now
          }
        ]
      })
    );

    const payload = await joinUserGroup(PROFILE_ID, {
      inviteCode: 'study-abcd'
    });

    expect(prismaMock.group.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          members: {
            create: {
              profileId: PROFILE_ID,
              role: 'MEMBER'
            }
          }
        }
      })
    );
    expect(payload.role).toBe('Member');
  });

  it('prevents duplicate joins', async () => {
    prismaMock.group.findUnique.mockResolvedValue(groupRecord());

    await expect(
      joinUserGroup(PROFILE_ID, { inviteCode: 'STUDY-ABCD' })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'You already belong to this group.'
    });
    expect(prismaMock.group.update).not.toHaveBeenCalled();
  });
});
