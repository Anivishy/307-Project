import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addPantryItem,
  listIngredientOptions,
  listPantryItems,
  updatePantryItem
} from './ingredient-service';

const prismaMock = vi.hoisted(() => ({
  profile: {
    findUnique: vi.fn()
  },
  ingredientCatalog: {
    findMany: vi.fn(),
    findUnique: vi.fn()
  },
  pantryItem: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('./prisma', () => ({
  prisma: prismaMock
}));

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const PANTRY_ITEM_ID = '00000000-0000-4000-8000-000000000002';
const TOMATO_ID = '00000000-0000-4000-8000-000000000003';
const OTHER_TOMATO_ID = '00000000-0000-4000-8000-000000000004';
const NOW = new Date('2026-05-15T12:00:00.000Z');

function ingredientOption(overrides = {}) {
  return {
    id: TOMATO_ID,
    name: 'Tomatoes',
    category: 'produce',
    defaultUnit: 'whole',
    allowedUnits: ['whole', 'cups', 'grams'],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

function pantryItem(overrides = {}) {
  return {
    id: PANTRY_ITEM_ID,
    ownerId: OWNER_ID,
    ingredientCatalogId: TOMATO_ID,
    quantity: 4,
    unit: 'whole',
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ingredient: ingredientOption(),
    ...overrides
  };
}

describe('ingredient service catalog-backed pantry items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists canonical catalog choices with optional search', async () => {
    prismaMock.ingredientCatalog.findMany.mockResolvedValue([
      ingredientOption()
    ]);

    await expect(
      listIngredientOptions('tom')
    ).resolves.toMatchObject([
      {
        id: TOMATO_ID,
        name: 'Tomatoes',
        defaultUnit: 'whole',
        allowedUnits: ['whole', 'cups', 'grams'],
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString()
      }
    ]);

    expect(
      prismaMock.ingredientCatalog.findMany
    ).toHaveBeenCalledWith({
      where: {
        name: {
          contains: 'tom',
          mode: 'insensitive'
        }
      },
      orderBy: { name: 'asc' }
    });
  });

  it('lists pantry rows joined to their catalog ingredient', async () => {
    prismaMock.pantryItem.findMany.mockResolvedValue([
      pantryItem()
    ]);

    await expect(listPantryItems(OWNER_ID)).resolves.toEqual([
      {
        id: PANTRY_ITEM_ID,
        ownerId: OWNER_ID,
        ingredientCatalogId: TOMATO_ID,
        name: 'Tomatoes',
        ingredient: {
          id: TOMATO_ID,
          name: 'Tomatoes',
          category: 'produce',
          defaultUnit: 'whole',
          allowedUnits: ['whole', 'cups', 'grams'],
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString()
        },
        quantity: 4,
        unit: 'whole',
        notes: null,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString()
      }
    ]);

    expect(prismaMock.pantryItem.findMany).toHaveBeenCalledWith(
      {
        where: { ownerId: OWNER_ID },
        include: { ingredient: true },
        orderBy: [
          { ingredient: { name: 'asc' } },
          { createdAt: 'asc' }
        ]
      }
    );
  });

  it('creates a pantry item only when the unit is allowed by the catalog row', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      id: OWNER_ID
    });
    prismaMock.ingredientCatalog.findUnique.mockResolvedValue(
      ingredientOption()
    );
    prismaMock.pantryItem.create.mockResolvedValue(
      pantryItem()
    );

    await expect(
      addPantryItem(OWNER_ID, {
        ingredientCatalogId: TOMATO_ID,
        quantity: 4,
        unit: 'whole'
      })
    ).resolves.toMatchObject({
      id: PANTRY_ITEM_ID,
      name: 'Tomatoes',
      quantity: 4,
      unit: 'whole'
    });

    expect(prismaMock.pantryItem.create).toHaveBeenCalledWith({
      data: {
        ownerId: OWNER_ID,
        ingredientCatalogId: TOMATO_ID,
        quantity: 4,
        unit: 'whole',
        notes: undefined
      },
      include: { ingredient: true }
    });
  });

  it('rejects a pantry item unit that does not belong to the selected ingredient', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      id: OWNER_ID
    });
    prismaMock.ingredientCatalog.findUnique.mockResolvedValue(
      ingredientOption()
    );

    await expect(
      addPantryItem(OWNER_ID, {
        ingredientCatalogId: TOMATO_ID,
        quantity: 4,
        unit: 'bottles'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'bottles is not an allowed unit for Tomatoes.'
    });

    expect(prismaMock.pantryItem.create).not.toHaveBeenCalled();
  });

  it('rejects blank required quantities instead of coercing them to zero', async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      id: OWNER_ID
    });
    prismaMock.ingredientCatalog.findUnique.mockResolvedValue(
      ingredientOption()
    );

    await expect(
      addPantryItem(OWNER_ID, {
        ingredientCatalogId: TOMATO_ID,
        quantity: '   ',
        unit: 'whole'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'quantity must be a non-negative number.'
    });

    expect(prismaMock.pantryItem.create).not.toHaveBeenCalled();
  });

  it('validates the final ingredient and unit pair before updating a pantry item', async () => {
    prismaMock.pantryItem.findFirst.mockResolvedValue(
      pantryItem()
    );
    prismaMock.ingredientCatalog.findUnique.mockResolvedValue(
      ingredientOption({
        id: OTHER_TOMATO_ID,
        name: 'Olive oil',
        defaultUnit: 'tbsp',
        allowedUnits: ['tbsp', 'tsp', 'ml']
      })
    );

    await expect(
      updatePantryItem(OWNER_ID, PANTRY_ITEM_ID, {
        ingredientCatalogId: OTHER_TOMATO_ID
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'whole is not an allowed unit for Olive oil.'
    });

    expect(prismaMock.pantryItem.update).not.toHaveBeenCalled();
  });

  it('returns the updated pantry item with its catalog data', async () => {
    prismaMock.pantryItem.findFirst.mockResolvedValue(
      pantryItem()
    );
    prismaMock.pantryItem.update.mockResolvedValue(
      pantryItem({ quantity: 6 })
    );

    await expect(
      updatePantryItem(OWNER_ID, PANTRY_ITEM_ID, {
        quantity: 6
      })
    ).resolves.toMatchObject({
      id: PANTRY_ITEM_ID,
      name: 'Tomatoes',
      quantity: 6,
      ingredient: {
        id: TOMATO_ID,
        allowedUnits: ['whole', 'cups', 'grams']
      }
    });
  });
});
