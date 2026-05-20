import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findOrCreateProfileForEmail } from './profile-service';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
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
