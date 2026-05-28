import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient
} from './ingredient-service';
import { searchIngredients } from './constraints/ingredients';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: {
      findUnique: vi.fn()
    },
    ingredient: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

vi.mock('./prisma', () => ({
  prisma: prismaMock
}));

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const INGREDIENT_ID = '22222222-2222-4222-8222-222222222222';
const now = new Date('2026-05-14T00:00:00.000Z');

function ingredientRecord(overrides = {}) {
  return {
    id: INGREDIENT_ID,
    ownerId: OWNER_ID,
    canonicalIngredientId: 'tomatoes',
    name: 'Tomatoes',
    quantity: 4,
    unit: 'whole',
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe('US3 pantry items from canonical ingredient database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.profile.findUnique.mockResolvedValue({
      id: OWNER_ID
    });
  });

  it('creates a pantry item with canonical ingredient id, quantity, and unit', async () => {
    prismaMock.ingredient.create.mockResolvedValue(
      ingredientRecord({ unit: 'each' })
    );

    const payload = await createIngredient(OWNER_ID, {
      canonicalIngredientId: 'TOMATOES',
      name: 'Tomatoes',
      quantity: '4',
      unit: 'each'
    });

    expect(prismaMock.ingredient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: OWNER_ID,
        canonicalIngredientId: 'tomatoes',
        name: 'Tomatoes',
        quantity: 4,
        unit: 'each'
      })
    });
    expect(payload).toMatchObject({
      canonicalIngredientId: 'tomatoes',
      quantity: 4,
      unit: 'each'
    });
  });

  it('returns relevant typeahead results from the canonical ingredient database', () => {
    const results = searchIngredients('tom', 10);

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tomato',
          name: 'Tomato',
          commonUnits: expect.arrayContaining(['each', 'cup'])
        }),
        expect.objectContaining({
          id: 'tomatoes',
          name: 'Tomatoes',
          commonUnits: expect.arrayContaining(['each', 'cup'])
        })
      ])
    );
  });

  it('rejects missing required fields when adding a pantry item', async () => {
    await expect(
      createIngredient(OWNER_ID, {
        canonicalIngredientId: 'tomatoes',
        quantity: 2,
        unit: 'each'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'name is required.'
    });

    expect(prismaMock.ingredient.create).not.toHaveBeenCalled();
  });

  it("lists only the authenticated user's pantry items", async () => {
    prismaMock.ingredient.findMany.mockResolvedValue([
      ingredientRecord(),
      ingredientRecord({
        id: '33333333-3333-4333-8333-333333333333',
        canonicalIngredientId: 'rice',
        name: 'Rice'
      })
    ]);

    const payload = await listIngredients(OWNER_ID);

    expect(prismaMock.ingredient.findMany).toHaveBeenCalledWith(
      {
        where: { ownerId: OWNER_ID },
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }]
      }
    );
    expect(payload).toHaveLength(2);
  });

  it('edits quantity and unit on an existing pantry item owned by the user', async () => {
    prismaMock.ingredient.findFirst.mockResolvedValue({
      id: INGREDIENT_ID,
      canonicalIngredientId: 'tomatoes',
      unit: 'whole'
    });
    prismaMock.ingredient.update.mockResolvedValue(
      ingredientRecord({ quantity: 6, unit: 'cup' })
    );

    const payload = await updateIngredient(
      OWNER_ID,
      INGREDIENT_ID,
      {
        quantity: 6,
        unit: 'cup'
      }
    );

    expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
      where: { id: INGREDIENT_ID },
      data: { quantity: 6, unit: 'cup' }
    });
    expect(payload.quantity).toBe(6);
    expect(payload.unit).toBe('cup');
  });

  it('rejects units that are incompatible with the canonical ingredient', async () => {
    await expect(
      createIngredient(OWNER_ID, {
        canonicalIngredientId: 'rice',
        name: 'Rice',
        quantity: 2,
        unit: 'clove'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'clove is not supported for Rice. Use one of: g, oz, cup.'
    });

    expect(prismaMock.ingredient.create).not.toHaveBeenCalled();
  });

  it('removes an existing pantry item owned by the user', async () => {
    prismaMock.ingredient.deleteMany.mockResolvedValue({
      count: 1
    });

    await deleteIngredient(OWNER_ID, INGREDIENT_ID);

    expect(
      prismaMock.ingredient.deleteMany
    ).toHaveBeenCalledWith({
      where: { id: INGREDIENT_ID, ownerId: OWNER_ID }
    });
  });
});
