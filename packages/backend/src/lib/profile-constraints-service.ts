import { ApiError } from './api-error';
import { emptyConstraints } from './constraints/normalize';
import type {
  UserConstraints,
  UserConstraintsInput
} from './constraints/types';
import { isUuid } from './request-user';

const constraintProfileSelect = {
  id: true,
  allergies: true,
  medicalRestrictions: true,
  neverIncludeIngredientIds: true,
  updatedAt: true
};

async function getPrismaClient() {
  const { prisma } = await import('./prisma');
  return prisma;
}

function assertValidUserId(userId: string) {
  if (!isUuid(userId)) {
    throw new ApiError(400, 'userId must be a valid UUID.');
  }
}

function serializeProfileConstraints(profile: {
  id: string;
  allergies: string[];
  medicalRestrictions: string[];
  neverIncludeIngredientIds: string[];
  updatedAt: Date;
}): UserConstraints {
  return {
    userId: profile.id,
    allergies: profile.allergies,
    medicalRestrictions: profile.medicalRestrictions,
    neverIncludeIngredientIds:
      profile.neverIncludeIngredientIds,
    updatedAt: profile.updatedAt.toISOString()
  };
}

export async function readProfileConstraints(
  userId: string
): Promise<UserConstraints> {
  assertValidUserId(userId);

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
  assertValidUserId(userId);

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
        empty.neverIncludeIngredientIds
    },
    select: constraintProfileSelect
  });

  return serializeProfileConstraints(profile);
}

export async function patchProfileConstraints(
  userId: string,
  input: UserConstraintsInput
): Promise<UserConstraints> {
  assertValidUserId(userId);

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
      : {})
  };

  const profile = await prisma.profile.update({
    where: { id: userId },
    data,
    select: constraintProfileSelect
  });

  return serializeProfileConstraints(profile);
}
