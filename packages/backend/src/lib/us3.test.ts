import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createIngredient,
  deleteIngredient,
  updateIngredient
} from './ingredient-service';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    profile: {
      findUnique: vi.fn()
    },
    ingredient: {
      create: vi.fn(),
      findFirst: vi.fn(),
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
    prismaMock.profile.findUnique.mockResolvedValue({ id: OWNER_ID });
  });

  it('creates a pantry item with canonical ingredient id, quantity, and unit', async () => {
    prismaMock.ingredient.create.mockResolvedValue(ingredientRecord());

    const payload = await createIngredient(OWNER_ID, {
      canonicalIngredientId: 'TOMATOES',
      name: 'Tomatoes',
      quantity: '4',
      unit: 'whole'
    });

    expect(prismaMock.ingredient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: OWNER_ID,
        canonicalIngredientId: 'tomatoes',
        name: 'Tomatoes',
        quantity: 4,
        unit: 'whole'
      })
    });
    expect(payload).toMatchObject({
      canonicalIngredientId: 'tomatoes',
      quantity: 4,
      unit: 'whole'
    });
  });

  it('edits an existing pantry item owned by the user', async () => {
    prismaMock.ingredient.findFirst.mockResolvedValue({ id: INGREDIENT_ID });
    prismaMock.ingredient.update.mockResolvedValue(
      ingredientRecord({ quantity: 6 })
    );

    const payload = await updateIngredient(OWNER_ID, INGREDIENT_ID, {
      quantity: 6
    });

    expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
      where: { id: INGREDIENT_ID },
      data: { quantity: 6 }
    });
    expect(payload.quantity).toBe(6);
  });

  it('removes an existing pantry item owned by the user', async () => {
    prismaMock.ingredient.deleteMany.mockResolvedValue({ count: 1 });

    await deleteIngredient(OWNER_ID, INGREDIENT_ID);

    expect(prismaMock.ingredient.deleteMany).toHaveBeenCalledWith({
      where: { id: INGREDIENT_ID, ownerId: OWNER_ID }
    });
  });
});
