import type { Ingredient } from '../generated/prisma';
import { randomUUID } from 'node:crypto';
import { ApiError } from './api-error';
import { shouldUseLocalDemoStore } from './database-env';
import {
  normalizeNullableText,
  normalizeRequiredText
} from './input-normalization';
import { isPrismaError } from './prisma-utils';
import { assertUuid } from './request-user';

// Ingredient service currently models each user's pantry items.
// The ownerId argument is resolved from the Supabase session, never trusted from request JSON.
type IngredientCreateInput = {
  canonicalIngredientId?: unknown;
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  notes?: unknown;
};

type IngredientUpdateInput = Partial<IngredientCreateInput>;

const demoIngredientsByOwner = new Map<string, Ingredient[]>();

async function getPrismaClient() {
  const { prisma } = await import('./prisma');
  return prisma;
}

function normalizeCanonicalIngredientId(value: unknown) {
  const normalized = normalizeNullableText(
    value,
    'canonicalIngredientId',
    80
  );

  if (normalized === null) {
    return null;
  }

  return normalized?.toLowerCase();
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
  // Prisma decimals serialize awkwardly; convert them before returning API JSON.
  return {
    id: ingredient.id,
    ownerId: ingredient.ownerId,
    canonicalIngredientId: ingredient.canonicalIngredientId,
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
  if (shouldUseLocalDemoStore()) {
    return;
  }

  // Fail with a clear 404 before relying on a database foreign-key error.
  const prisma = await getPrismaClient();
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

  if (shouldUseLocalDemoStore()) {
    const ingredients = demoIngredientsByOwner.get(ownerId) ?? [];
    return ingredients
      .toSorted((left, right) =>
        left.name.localeCompare(right.name)
      )
      .map(serializeIngredient);
  }

  const prisma = await getPrismaClient();
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

  if (shouldUseLocalDemoStore()) {
    const ingredients = demoIngredientsByOwner.get(ownerId) ?? [];
    const name = normalizeRequiredText(input.name, 'name', 120);

    if (
      ingredients.some(
        (ingredient) =>
          ingredient.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      throw new ApiError(
        409,
        'You already have an ingredient with that name.'
      );
    }

    const now = new Date();
    const ingredient = {
      id: randomUUID(),
      ownerId,
      canonicalIngredientId: normalizeCanonicalIngredientId(
        input.canonicalIngredientId
      ),
      name,
      quantity: normalizeNullableQuantity(input.quantity),
      unit: normalizeNullableText(input.unit, 'unit', 40),
      notes: normalizeNullableText(input.notes, 'notes', 2_000),
      createdAt: now,
      updatedAt: now
    } as Ingredient;
    ingredients.push(ingredient);
    demoIngredientsByOwner.set(ownerId, ingredients);
    return serializeIngredient(ingredient);
  }

  const prisma = await getPrismaClient();

  try {
    const ingredient = await prisma.ingredient.create({
      data: {
        ownerId,
        canonicalIngredientId: normalizeCanonicalIngredientId(
          input.canonicalIngredientId
        ),
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
      // P2002 maps to @@unique([ownerId, name]) in schema.prisma.
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
    ...(input.canonicalIngredientId !== undefined
      ? {
          canonicalIngredientId: normalizeCanonicalIngredientId(
            input.canonicalIngredientId
          )
        }
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

  if (shouldUseLocalDemoStore()) {
    const ingredients = demoIngredientsByOwner.get(ownerId) ?? [];
    const ingredient = ingredients.find(
      (item) => item.id === ingredientId
    );

    if (!ingredient) {
      throw new ApiError(404, 'Ingredient not found.');
    }

    if (
      'name' in data &&
      ingredients.some(
        (item) =>
          item.id !== ingredientId &&
          item.name.toLowerCase() ===
            String(data.name).toLowerCase()
      )
    ) {
      throw new ApiError(
        409,
        'You already have an ingredient with that name.'
      );
    }

    Object.assign(ingredient, data, { updatedAt: new Date() });
    return serializeIngredient(ingredient);
  }

  const prisma = await getPrismaClient();
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

  if (shouldUseLocalDemoStore()) {
    const ingredients = demoIngredientsByOwner.get(ownerId) ?? [];
    const nextIngredients = ingredients.filter(
      (ingredient) => ingredient.id !== ingredientId
    );

    if (nextIngredients.length === ingredients.length) {
      throw new ApiError(404, 'Ingredient not found.');
    }

    demoIngredientsByOwner.set(ownerId, nextIngredients);
    return;
  }

  const prisma = await getPrismaClient();
  const result = await prisma.ingredient.deleteMany({
    where: { id: ingredientId, ownerId }
  });

  if (result.count === 0) {
    throw new ApiError(404, 'Ingredient not found.');
  }
}
