import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readPersistedGroupSettings,
  savePersistedGroupSettings
} from './group-settings-service';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    group: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock('./prisma', () => ({
  prisma: prismaMock
}));

const GROUP_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const now = new Date('2026-05-26T12:00:00.000Z');

function membership(profileId = ADMIN_ID, role = 'ADMIN') {
  return {
    id: `${profileId}-membership`,
    groupId: GROUP_ID,
    profileId,
    role,
    joinedAt: now
  };
}

function groupRecord(overrides = {}) {
  return {
    id: GROUP_ID,
    ownerId: ADMIN_ID,
    name: 'Study Dinner Crew',
    description: 'New shared pantry group.',
    inviteCode: 'STUDY-ABCD',
    pantrySnapshotVersion: 1,
    activeBundleVersion: 1,
    selectedBundleId: null,
    allowMissingIngredients: false,
    staplesEnabled: false,
    customStaples: ['salt'],
    createdAt: now,
    updatedAt: now,
    members: [membership(ADMIN_ID, 'ADMIN'), membership(MEMBER_ID, 'MEMBER')],
    ...overrides
  };
}

describe('persisted group settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads SRD settings for an existing group member', async () => {
    prismaMock.group.findUnique.mockResolvedValue(groupRecord());

    const payload = await readPersistedGroupSettings(GROUP_ID, ADMIN_ID);

    expect(payload).toMatchObject({
      groupId: GROUP_ID,
      groupName: 'Study Dinner Crew',
      allowMissingIngredients: false,
      staplesEnabled: false,
      viewerRole: 'admin'
    });
    expect(payload.defaultStaplesPreset.map((item) => item.id)).toEqual([
      'olive-oil',
      'butter',
      'salt',
      'pepper'
    ]);
    expect(payload.customStaples).toEqual([
      expect.objectContaining({ id: 'salt', name: 'Salt' })
    ]);
  });

  it('allows admins to update missing-ingredient and staples settings', async () => {
    prismaMock.group.findUnique.mockResolvedValue(groupRecord());
    prismaMock.group.update.mockResolvedValue(
      groupRecord({
        allowMissingIngredients: true,
        staplesEnabled: true,
        customStaples: ['rice', 'salt']
      })
    );

    const payload = await savePersistedGroupSettings(GROUP_ID, ADMIN_ID, {
      allowMissingIngredients: true,
      staplesEnabled: true,
      customStaples: ['rice', 'salt', 'rice']
    });

    expect(prismaMock.group.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          allowMissingIngredients: true,
          staplesEnabled: true,
          customStaples: ['rice', 'salt']
        }
      })
    );
    expect(payload).toMatchObject({
      allowMissingIngredients: true,
      staplesEnabled: true
    });
    expect(payload.customStaples.map((item) => item.id)).toEqual([
      'rice',
      'salt'
    ]);
  });

  it('blocks non-admin members from updating settings', async () => {
    prismaMock.group.findUnique.mockResolvedValue(groupRecord());

    await expect(
      savePersistedGroupSettings(GROUP_ID, MEMBER_ID, {
        staplesEnabled: true
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Only admins can update group settings.'
    });
    expect(prismaMock.group.update).not.toHaveBeenCalled();
  });

  it('rejects unknown custom staples before saving', async () => {
    prismaMock.group.findUnique.mockResolvedValue(groupRecord());

    await expect(
      savePersistedGroupSettings(GROUP_ID, ADMIN_ID, {
        customStaples: ['not-real']
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Unknown staple ingredient id: not-real.'
    });
    expect(prismaMock.group.update).not.toHaveBeenCalled();
  });
});
