import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGroupPantry } from './group-pantry-service';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    group: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock('./prisma', () => ({
  prisma: prismaMock
}));

const GROUP_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const OUTSIDER_ID = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-05-14T00:00:00.000Z');

function ingredient(overrides = {}) {
  return {
    id: 'ingredient-1',
    ownerId: ADMIN_ID,
    canonicalIngredientId: 'rice',
    name: 'Rice',
    quantity: 2,
    unit: 'cups',
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function groupRecord() {
  return {
    id: GROUP_ID,
    members: [
      {
        profileId: ADMIN_ID,
        joinedAt: now,
        profile: {
          displayName: 'Avery Cook',
          email: 'avery@example.com',
          ingredients: [
            ingredient({
              id: 'rice-a',
              ownerId: ADMIN_ID,
              quantity: 2
            }),
            ingredient({
              id: 'tomato-a',
              ownerId: ADMIN_ID,
              canonicalIngredientId: 'tomato',
              name: 'Tomato',
              quantity: 4,
              unit: 'each'
            })
          ]
        }
      },
      {
        profileId: MEMBER_ID,
        joinedAt: now,
        profile: {
          displayName: 'Sam Prep',
          email: 'sam@example.com',
          ingredients: [
            ingredient({
              id: 'rice-s',
              ownerId: MEMBER_ID,
              quantity: 3
            })
          ]
        }
      }
    ]
  };
}

describe('US4 cumulative group pantry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.group.findUnique.mockResolvedValue(
      groupRecord()
    );
  });

  it('merges matching pantry items and returns owner metadata', async () => {
    const pantry = await getGroupPantry(GROUP_ID, ADMIN_ID);

    expect(prismaMock.group.findUnique).toHaveBeenCalledWith({
      where: { id: GROUP_ID },
      include: expect.any(Object)
    });
    expect(pantry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: 'rice',
          name: 'Rice',
          quantity: 5,
          unit: 'cups',
          owners: [
            expect.objectContaining({
              userId: ADMIN_ID,
              displayName: 'Avery Cook',
              initials: 'AC',
              quantity: 2
            }),
            expect.objectContaining({
              userId: MEMBER_ID,
              displayName: 'Sam Prep',
              initials: 'SP',
              quantity: 3
            })
          ]
        })
      ])
    );
  });

  it('filters the merged pantry by owner id', async () => {
    const pantry = await getGroupPantry(
      GROUP_ID,
      ADMIN_ID,
      MEMBER_ID
    );

    expect(pantry).toEqual([
      expect.objectContaining({
        ingredientId: 'rice',
        quantity: 3,
        owners: [
          expect.objectContaining({
            userId: MEMBER_ID,
            displayName: 'Sam Prep'
          })
        ]
      })
    ]);
  });

  it('blocks non-members from reading the group pantry', async () => {
    await expect(
      getGroupPantry(GROUP_ID, OUTSIDER_ID)
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'You are not a member of this group.'
    });
  });
});
