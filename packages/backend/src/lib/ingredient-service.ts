import type { Ingredient } from '../generated/prisma';
import { ApiError } from './api-error';
import { prisma } from './prisma';
import { assertUuid } from './request-user';

type IngredientCreateInput = {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  notes?: unknown;
};

type IngredientUpdateInput = Partial<IngredientCreateInput>;

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function normalizeRequiredText(
  value: unknown,
  fieldName: string,
  maxLength: number
) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} is required.`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer.`
    );
  }

  return trimmed;
}

function normalizeNullableText(
  value: unknown,
  fieldName: string,
  maxLength: number
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, `${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer.`
    );
  }

  return trimmed || null;
}

function normalizeNullableQuantity(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const quantity =
    typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new ApiError(
      400,
      'quantity must be a non-negative number.'
    );
  }

  return quantity;
}

function serializeIngredient(ingredient: Ingredient) {
  return {
    id: ingredient.id,
    ownerId: ingredient.ownerId,
    name: ingredient.name,
    quantity:
      ingredient.quantity === null
        ? null
        : Number(ingredient.quantity),
    unit: ingredient.unit,
    notes: ingredient.notes,
    createdAt: ingredient.createdAt.toISOString(),
    updatedAt: ingredient.updatedAt.toISOString()
  };
}

async function ensureProfileExists(ownerId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: ownerId },
    select: { id: true }
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }
}

export async function listIngredients(ownerId: string) {
  assertUuid(ownerId, 'ownerId');

  const ingredients = await prisma.ingredient.findMany({
    where: { ownerId },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }]
  });

  return ingredients.map(serializeIngredient);
}

export async function createIngredient(
  ownerId: string,
  input: IngredientCreateInput
) {
  assertUuid(ownerId, 'ownerId');
  await ensureProfileExists(ownerId);

  try {
    const ingredient = await prisma.ingredient.create({
      data: {
        ownerId,
        name: normalizeRequiredText(input.name, 'name', 120),
        quantity: normalizeNullableQuantity(input.quantity),
        unit: normalizeNullableText(input.unit, 'unit', 40),
        notes: normalizeNullableText(
          input.notes,
          'notes',
          2_000
        )
      }
    });

    return serializeIngredient(ingredient);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      throw new ApiError(
        409,
        'You already have an ingredient with that name.'
      );
    }

    throw error;
  }
}

export async function updateIngredient(
  ownerId: string,
  ingredientId: string,
  input: IngredientUpdateInput
) {
  assertUuid(ownerId, 'ownerId');
  assertUuid(ingredientId, 'ingredientId');

  const data = {
    ...(input.name !== undefined
      ? { name: normalizeRequiredText(input.name, 'name', 120) }
      : {}),
    ...(input.quantity !== undefined
      ? { quantity: normalizeNullableQuantity(input.quantity) }
      : {}),
    ...(input.unit !== undefined
      ? { unit: normalizeNullableText(input.unit, 'unit', 40) }
      : {}),
    ...(input.notes !== undefined
      ? {
          notes: normalizeNullableText(
            input.notes,
            'notes',
            2_000
          )
        }
      : {})
  };

  if (Object.keys(data).length === 0) {
    throw new ApiError(
      400,
      'No supported ingredient fields were provided.'
    );
  }

  const existingIngredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, ownerId },
    select: { id: true }
  });

  if (!existingIngredient) {
    throw new ApiError(404, 'Ingredient not found.');
  }

  try {
    const ingredient = await prisma.ingredient.update({
      where: { id: ingredientId },
      data
    });

    return serializeIngredient(ingredient);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      throw new ApiError(
        409,
        'You already have an ingredient with that name.'
      );
    }

    throw error;
  }
}

export async function deleteIngredient(
  ownerId: string,
  ingredientId: string
) {
  assertUuid(ownerId, 'ownerId');
  assertUuid(ingredientId, 'ingredientId');

  const result = await prisma.ingredient.deleteMany({
    where: { id: ingredientId, ownerId }
  });

  if (result.count === 0) {
    throw new ApiError(404, 'Ingredient not found.');
  }
}
