import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH as patchProfileMe } from '../app/api/profiles/me/route';
import {
  anonymizeProfileForAccountDeletion,
  findOrCreateProfileForEmail,
  PROFILE_PICTURE_MAX_SIZE_BYTES,
  updateProfileEmail,
  updateProfileIdentity
} from './profile-service';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    groupMember: {
      deleteMany: vi.fn()
    },
    ingredient: {
      deleteMany: vi.fn()
    },
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

vi.mock('./prisma', () => ({
  prisma: prismaMock
}));

const oldProfileId = '11111111-1111-4111-8111-111111111111';
const supabaseUserId = '22222222-2222-4222-8222-222222222222';
const now = new Date('2026-05-14T00:00:00.000Z');

function profileRecord(overrides = {}) {
  return {
    id: oldProfileId,
    email: 'kartik@example.com',
    displayName: 'Kartik',
    profilePictureUrl: null,
    profilePictureStorageRef: null,
    profilePictureContentType: null,
    profilePictureSizeBytes: null,
    allergies: [],
    medicalRestrictions: [],
    neverIncludeIngredientIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('profile service auth reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates an existing email profile to the Supabase auth id', async () => {
    prismaMock.profile.findUnique.mockResolvedValue(
      profileRecord()
    );
    prismaMock.profile.update.mockResolvedValue(
      profileRecord({ id: supabaseUserId })
    );

    const profile = await findOrCreateProfileForEmail({
      id: supabaseUserId,
      email: 'Kartik@Example.com'
    });

    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { email: 'kartik@example.com' },
      data: { id: supabaseUserId }
    });
    expect(prismaMock.profile.upsert).not.toHaveBeenCalled();
    expect(profile).toMatchObject({
      id: supabaseUserId,
      email: 'kartik@example.com'
    });
  });
});

describe('profile service identity updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates display name and profile picture metadata', async () => {
    prismaMock.profile.update.mockResolvedValue(
      profileRecord({
        id: supabaseUserId,
        displayName: 'Avery Cook',
        profilePictureUrl:
          'https://cdn.example.com/avatars/avery.png',
        profilePictureContentType: 'image/png',
        profilePictureSizeBytes: 1024
      })
    );

    const profile = await updateProfileIdentity(
      supabaseUserId,
      {
        displayName: ' Avery Cook ',
        profilePicture: {
          url: 'https://cdn.example.com/avatars/avery.png',
          contentType: 'IMAGE/PNG',
          sizeBytes: '1024'
        }
      }
    );

    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { id: supabaseUserId },
      data: {
        displayName: 'Avery Cook',
        profilePictureUrl:
          'https://cdn.example.com/avatars/avery.png',
        profilePictureStorageRef: null,
        profilePictureContentType: 'image/png',
        profilePictureSizeBytes: 1024
      }
    });
    expect(profile).toMatchObject({
      id: supabaseUserId,
      displayName: 'Avery Cook',
      profilePictureUrl:
        'https://cdn.example.com/avatars/avery.png',
      profilePictureContentType: 'image/png',
      profilePictureSizeBytes: 1024
    });
  });

  it('clears profile picture fields when profilePicture is null', async () => {
    prismaMock.profile.update.mockResolvedValue(
      profileRecord({
        id: supabaseUserId,
        profilePictureUrl: null,
        profilePictureStorageRef: null,
        profilePictureContentType: null,
        profilePictureSizeBytes: null
      })
    );

    await updateProfileIdentity(supabaseUserId, {
      profilePicture: null
    });

    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { id: supabaseUserId },
      data: {
        profilePictureUrl: null,
        profilePictureStorageRef: null,
        profilePictureContentType: null,
        profilePictureSizeBytes: null
      }
    });
  });

  it('rejects display name validation errors before saving', async () => {
    await expect(
      updateProfileIdentity(supabaseUserId, {
        displayName: 'A'.repeat(121)
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'displayName must be 120 characters or fewer.'
    });

    expect(prismaMock.profile.update).not.toHaveBeenCalled();
  });

  it('rejects unsupported profile picture file types before saving', async () => {
    await expect(
      updateProfileIdentity(supabaseUserId, {
        profilePicture: {
          url: 'https://cdn.example.com/avatars/avery.svg',
          contentType: 'image/svg+xml',
          sizeBytes: 1024
        }
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'profilePicture.contentType must be one of image/jpeg, image/png, image/webp, image/gif.'
    });

    expect(prismaMock.profile.update).not.toHaveBeenCalled();
  });

  it('rejects oversized profile pictures before saving', async () => {
    await expect(
      updateProfileIdentity(supabaseUserId, {
        profilePicture: {
          storageRef: 'avatars/avery.png',
          contentType: 'image/png',
          sizeBytes: PROFILE_PICTURE_MAX_SIZE_BYTES + 1
        }
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: `profilePicture.sizeBytes must be between 1 and ${PROFILE_PICTURE_MAX_SIZE_BYTES}.`
    });

    expect(prismaMock.profile.update).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated profile update requests', async () => {
    const response = await patchProfileMe(
      new Request('http://localhost/api/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: 'Avery Cook' })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        message: 'Missing Authorization bearer token.'
      }
    });
    expect(prismaMock.profile.update).not.toHaveBeenCalled();
  });

  it('rejects duplicate local profile emails during email changes', async () => {
    prismaMock.profile.update.mockRejectedValue({ code: 'P2002' });

    await expect(
      updateProfileEmail(supabaseUserId, 'avery@example.com')
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'A profile with that email already exists.'
    });
  });

  it('removes profile-owned data and anonymizes the profile during account deletion', async () => {
    const deleteIngredients = { operation: 'delete-ingredients' };
    const deleteMemberships = {
      operation: 'delete-memberships'
    };
    const anonymizeProfile = {
      operation: 'anonymize-profile'
    };
    prismaMock.ingredient.deleteMany.mockReturnValue(
      deleteIngredients
    );
    prismaMock.groupMember.deleteMany.mockReturnValue(
      deleteMemberships
    );
    prismaMock.profile.update.mockReturnValue(anonymizeProfile);
    prismaMock.$transaction.mockResolvedValue([
      { count: 3 },
      { count: 2 },
      profileRecord({
        id: supabaseUserId,
        email: `deleted-${supabaseUserId}@deleted.local`,
        displayName: 'Deleted account'
      })
    ]);

    const payload =
      await anonymizeProfileForAccountDeletion(supabaseUserId);

    expect(prismaMock.ingredient.deleteMany).toHaveBeenCalledWith({
      where: { ownerId: supabaseUserId }
    });
    expect(prismaMock.groupMember.deleteMany).toHaveBeenCalledWith({
      where: { profileId: supabaseUserId }
    });
    expect(prismaMock.profile.update).toHaveBeenCalledWith({
      where: { id: supabaseUserId },
      data: {
        email: `deleted-${supabaseUserId}@deleted.local`,
        displayName: 'Deleted account',
        profilePictureUrl: null,
        profilePictureStorageRef: null,
        profilePictureContentType: null,
        profilePictureSizeBytes: null,
        allergies: [],
        medicalRestrictions: [],
        neverIncludeIngredientIds: []
      }
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      deleteIngredients,
      deleteMemberships,
      anonymizeProfile
    ]);
    expect(payload).toEqual({
      profileId: supabaseUserId,
      membershipsRemoved: true,
      profileAnonymized: true
    });
  });
});
