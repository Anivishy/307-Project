import { ApiError } from './api-error';
import { emptyConstraints } from './constraints/normalize';
import {
  getUserConstraints,
  patchUserConstraints,
  replaceUserConstraints
} from './constraints/store';
import type {
  UserConstraints,
  UserConstraintsInput
} from './constraints/types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const constraintProfileSelect = {
  id: true,
  allergies: true,
  medicalRestrictions: true,
  neverIncludeIngredientIds: true,
  updatedAt: true
};

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

async function getPrismaClient() {
  const { prisma } = await import('./prisma');
  return prisma;
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

async function readDbProfileConstraints(userId: string) {
  if (!isUuid(userId)) {
    return null;
  }

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

async function updateDbProfileConstraints(
  userId: string,
  input: UserConstraintsInput,
  mode: 'patch' | 'replace'
) {
  if (!isUuid(userId)) {
    return null;
  }

  const prisma = await getPrismaClient();
  const existingProfile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!existingProfile) {
    throw new ApiError(404, 'Profile not found.');
  }

  const empty = emptyConstraints(userId);
  const data =
    mode === 'replace'
      ? {
          allergies: input.allergies ?? empty.allergies,
          medicalRestrictions:
            input.medicalRestrictions ??
            empty.medicalRestrictions,
          neverIncludeIngredientIds:
            input.neverIncludeIngredientIds ??
            empty.neverIncludeIngredientIds
        }
      : {
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

export async function readProfileConstraints(userId: string) {
  return (
    (await readDbProfileConstraints(userId)) ??
    getUserConstraints(userId)
  );
}

export async function replaceProfileConstraints(
  userId: string,
  input: UserConstraintsInput
) {
  return (
    (await updateDbProfileConstraints(
      userId,
      input,
      'replace'
    )) ?? replaceUserConstraints(userId, input)
  );
}

export async function patchProfileConstraints(
  userId: string,
  input: UserConstraintsInput
) {
  return (
    (await updateDbProfileConstraints(
      userId,
      input,
      'patch'
    )) ?? patchUserConstraints(userId, input)
  );
}
