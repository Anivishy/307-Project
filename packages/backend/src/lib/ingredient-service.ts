import type {
  IngredientCatalog,
  PantryItem
} from '../generated/prisma';
import { ApiError, isPrismaError } from './api-error';
import { prisma } from './prisma';
import { assertUuid } from './request-user';

// The ownerId argument always comes from x-user-id, never from request JSON.
type PantryRequestBody = {
  ingredientCatalogId?: unknown;
  quantity?: unknown;
  unit?: unknown;
  notes?: unknown;
};

type PantryPatchBody = Partial<PantryRequestBody>;

type NewPantryItem = {
  ingredientCatalogId: string;
  quantity: number;
  unit: string;
  notes?: string | null;
};

type PantryPatch = Partial<NewPantryItem>;

type PantryRow = PantryItem & {
  ingredient: IngredientCatalog;
};

export async function listIngredientOptions(search?: string) {
  const searchTerm = search?.trim();
  const options = await prisma.ingredientCatalog.findMany({
    where: searchTerm
      ? {
          name: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }
      : {},
    orderBy: { name: 'asc' }
  });

  return options.map(formatIngredientOption);
}

export async function listPantryItems(ownerId: string) {
  assertUuid(ownerId, 'ownerId');

  const pantryItems = await prisma.pantryItem.findMany({
    where: { ownerId },
    include: { ingredient: true },
    orderBy: [
      { ingredient: { name: 'asc' } },
      { createdAt: 'asc' }
    ]
  });

  return pantryItems.map(formatPantryItem);
}

export async function addPantryItem(
  ownerId: string,
  input: PantryRequestBody
) {
  assertUuid(ownerId, 'ownerId');
  await requireProfile(ownerId);

  const fields = readPantryFields(input, 'create');
  const catalogItem = await getCatalogItem(
    fields.ingredientCatalogId
  );
  requireAllowedUnit(catalogItem, fields.unit);

  try {
    const pantryItem = await prisma.pantryItem.create({
      data: {
        ownerId,
        ...fields
      },
      include: { ingredient: true }
    });

    return formatPantryItem(pantryItem);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      throw new ApiError(
        409,
        'You already have that ingredient with that unit.'
      );
    }

    throw error;
  }
}

export async function updatePantryItem(
  ownerId: string,
  pantryItemId: string,
  input: PantryPatchBody
) {
  assertUuid(ownerId, 'ownerId');
  assertUuid(pantryItemId, 'ingredientId');

  const fields = readPantryFields(input, 'update');
  const pantryItem = await prisma.pantryItem.findFirst({
    where: { id: pantryItemId, ownerId },
    include: { ingredient: true }
  });

  if (!pantryItem) {
    throw new ApiError(404, 'Pantry item not found.');
  }

  const catalogItem =
    fields.ingredientCatalogId !== undefined
      ? await getCatalogItem(fields.ingredientCatalogId)
      : pantryItem.ingredient;
  requireAllowedUnit(
    catalogItem,
    fields.unit ?? pantryItem.unit
  );

  try {
    const updatedItem = await prisma.pantryItem.update({
      where: { id: pantryItemId },
      data: fields,
      include: { ingredient: true }
    });

    return formatPantryItem(updatedItem);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      throw new ApiError(
        409,
        'You already have that ingredient with that unit.'
      );
    }

    throw error;
  }
}

export async function deletePantryItem(
  ownerId: string,
  pantryItemId: string
) {
  assertUuid(ownerId, 'ownerId');
  assertUuid(pantryItemId, 'ingredientId');

  const result = await prisma.pantryItem.deleteMany({
    where: { id: pantryItemId, ownerId }
  });

  if (result.count === 0) {
    throw new ApiError(404, 'Pantry item not found.');
  }
}

function readPantryFields(
  input: PantryRequestBody,
  mode: 'create'
): NewPantryItem;
function readPantryFields(
  input: PantryPatchBody,
  mode: 'update'
): PantryPatch;
function readPantryFields(
  input: PantryRequestBody,
  mode: 'create' | 'update'
) {
  const isUpdate = mode === 'update';
  const fields: PantryPatch = {};
  const shouldRead = (field: keyof PantryRequestBody) =>
    !isUpdate || input[field] !== undefined;

  if (shouldRead('ingredientCatalogId')) {
    if (
      typeof input.ingredientCatalogId !== 'string' ||
      input.ingredientCatalogId.trim().length === 0
    ) {
      throw new ApiError(
        400,
        'ingredientCatalogId is required.'
      );
    }

    const ingredientCatalogId =
      input.ingredientCatalogId.trim();
    assertUuid(ingredientCatalogId, 'ingredientCatalogId');
    fields.ingredientCatalogId = ingredientCatalogId;
  }

  if (shouldRead('quantity')) {
    if (
      typeof input.quantity !== 'number' ||
      !Number.isFinite(input.quantity) ||
      input.quantity < 0
    ) {
      throw new ApiError(
        400,
        'quantity must be a non-negative number.'
      );
    }

    fields.quantity = input.quantity;
  }

  if (shouldRead('unit')) {
    if (
      typeof input.unit !== 'string' ||
      input.unit.trim().length === 0
    ) {
      throw new ApiError(400, 'unit is required.');
    }

    fields.unit = input.unit.trim();
  }

  if (input.notes !== undefined) {
    if (input.notes === null) {
      fields.notes = null;
    } else if (typeof input.notes !== 'string') {
      throw new ApiError(400, 'notes must be a string.');
    } else {
      fields.notes = input.notes.trim() || null;
    }
  }

  if (isUpdate && Object.keys(fields).length === 0) {
    throw new ApiError(
      400,
      'No supported ingredient fields were provided.'
    );
  }

  return fields;
}

function formatIngredientOption(option: IngredientCatalog) {
  return {
    id: option.id,
    name: option.name,
    category: option.category,
    defaultUnit: option.defaultUnit,
    allowedUnits: option.allowedUnits,
    createdAt: option.createdAt.toISOString(),
    updatedAt: option.updatedAt.toISOString()
  };
}

function formatPantryItem(pantryItem: PantryRow) {
  return {
    id: pantryItem.id,
    ownerId: pantryItem.ownerId,
    ingredientCatalogId: pantryItem.ingredientCatalogId,
    name: pantryItem.ingredient.name,
    ingredient: formatIngredientOption(pantryItem.ingredient),
    quantity: Number(pantryItem.quantity),
    unit: pantryItem.unit,
    notes: pantryItem.notes,
    createdAt: pantryItem.createdAt.toISOString(),
    updatedAt: pantryItem.updatedAt.toISOString()
  };
}

async function requireProfile(ownerId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: ownerId },
    select: { id: true }
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }
}

async function getCatalogItem(ingredientCatalogId: string) {
  const catalogItem = await prisma.ingredientCatalog.findUnique(
    {
      where: { id: ingredientCatalogId }
    }
  );

  if (!catalogItem) {
    throw new ApiError(400, 'Unknown ingredientCatalogId.');
  }

  return catalogItem;
}

function requireAllowedUnit(
  catalogItem: IngredientCatalog,
  unit: string
) {
  if (!catalogItem.allowedUnits.includes(unit)) {
    throw new ApiError(
      400,
      `${unit} is not an allowed unit for ${catalogItem.name}.`
    );
  }
}
