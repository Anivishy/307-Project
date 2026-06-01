import { ApiError } from './api-error';
import { emptyConstraints } from './constraints/normalize';
import type {
  UserConstraints,
  UserConstraintsInput
} from './constraints/types';
import { assertUuid } from './request-user';

const constraintProfileSelect = {
  id: true,
  allergies: true,
  medicalRestrictions: true,
  neverIncludeIngredientIds: true,
  diets: true,
  intolerances: true,
  preferredCuisines: true,
  excludedCuisines: true,
  dislikedIngredients: true,
  spiceLevel: true,
  updatedAt: true
};

async function getPrismaClient() {
  const { prisma } = await import('./prisma');
  return prisma;
}

function serializeProfileConstraints(profile: {
  id: string;
  allergies: string[];
  medicalRestrictions: string[];
  neverIncludeIngredientIds: string[];
  diets?: string[];
  intolerances?: string[];
  preferredCuisines?: string[];
  excludedCuisines?: string[];
  dislikedIngredients?: string[];
  spiceLevel?: string | null;
  updatedAt: Date;
}): UserConstraints {
  return {
    userId: profile.id,
    allergies: profile.allergies,
    medicalRestrictions: profile.medicalRestrictions,
    neverIncludeIngredientIds:
      profile.neverIncludeIngredientIds,
    diets: profile.diets ?? [],
    intolerances: profile.intolerances ?? [],
    preferredCuisines: profile.preferredCuisines ?? [],
    excludedCuisines: profile.excludedCuisines ?? [],
    dislikedIngredients: profile.dislikedIngredients ?? [],
    spiceLevel: profile.spiceLevel ?? null,
    updatedAt: profile.updatedAt.toISOString()
  };
}

export async function listProfileConstraintsForUsers(
  userIds: string[]
): Promise<UserConstraints[]> {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const prisma = await getPrismaClient();
  const profiles = await prisma.profile.findMany({
    where: {
      id: {
        in: uniqueUserIds
      }
    },
    select: constraintProfileSelect
  });

  const byId = new Map(
    profiles.map((profile) => [
      profile.id,
      serializeProfileConstraints(profile)
    ])
  );

  return uniqueUserIds
    .map((userId) => byId.get(userId))
    .filter((constraints): constraints is UserConstraints =>
      Boolean(constraints)
    );
}

export async function readProfileConstraints(
  userId: string
): Promise<UserConstraints> {
  assertUuid(userId, 'userId');

  const prisma = await getPrismaClient();
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: constraintProfileSelect
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  return serializeProfileConstraints(profile);
}

export async function replaceProfileConstraints(
  userId: string,
  input: UserConstraintsInput
): Promise<UserConstraints> {
  assertUuid(userId, 'userId');

  const prisma = await getPrismaClient();
  const existingProfile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!existingProfile) {
    throw new ApiError(404, 'Profile not found.');
  }

  const empty = emptyConstraints(userId);
  const profile = await prisma.profile.update({
    where: { id: userId },
    data: {
      allergies: input.allergies ?? empty.allergies,
      medicalRestrictions:
        input.medicalRestrictions ?? empty.medicalRestrictions,
      neverIncludeIngredientIds:
        input.neverIncludeIngredientIds ??
        empty.neverIncludeIngredientIds,
      diets: input.diets ?? empty.diets ?? [],
      intolerances: input.intolerances ?? empty.intolerances ?? [],
      preferredCuisines:
        input.preferredCuisines ?? empty.preferredCuisines ?? [],
      excludedCuisines:
        input.excludedCuisines ?? empty.excludedCuisines ?? [],
      dislikedIngredients:
        input.dislikedIngredients ?? empty.dislikedIngredients ?? [],
      spiceLevel: input.spiceLevel ?? empty.spiceLevel ?? null
    },
    select: constraintProfileSelect
  });

  return serializeProfileConstraints(profile);
}

export async function patchProfileConstraints(
  userId: string,
  input: UserConstraintsInput
): Promise<UserConstraints> {
  assertUuid(userId, 'userId');

  const prisma = await getPrismaClient();
  const existingProfile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!existingProfile) {
    throw new ApiError(404, 'Profile not found.');
  }

  const data = {
    ...(input.allergies !== undefined
      ? { allergies: input.allergies }
      : {}),
    ...(input.medicalRestrictions !== undefined
      ? { medicalRestrictions: input.medicalRestrictions }
      : {}),
    ...(input.neverIncludeIngredientIds !== undefined
      ? {
          neverIncludeIngredientIds:
            input.neverIncludeIngredientIds
        }
      : {}),
    ...(input.diets !== undefined ? { diets: input.diets } : {}),
    ...(input.intolerances !== undefined
      ? { intolerances: input.intolerances }
      : {}),
    ...(input.preferredCuisines !== undefined
      ? { preferredCuisines: input.preferredCuisines }
      : {}),
    ...(input.excludedCuisines !== undefined
      ? { excludedCuisines: input.excludedCuisines }
      : {}),
    ...(input.dislikedIngredients !== undefined
      ? { dislikedIngredients: input.dislikedIngredients }
      : {}),
    ...(input.spiceLevel !== undefined
      ? { spiceLevel: input.spiceLevel }
      : {})
  };

  const profile = await prisma.profile.update({
    where: { id: userId },
    data,
    select: constraintProfileSelect
  });

  return serializeProfileConstraints(profile);
}
