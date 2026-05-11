import type { Profile } from '../generated/prisma';
import { ApiError } from './api-error';
import { prisma } from './prisma';
import { assertUuid } from './request-user';

type ProfileCreateInput = {
  id?: unknown;
  email?: unknown;
  displayName?: unknown;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function normalizeOptionalText(
  value: unknown,
  fieldName: string,
  maxLength: number
) {
  if (value === undefined || value === null) {
    return undefined;
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

  return trimmed || undefined;
}

function serializeProfile(profile: Profile) {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

export async function createProfile(input: ProfileCreateInput) {
  if (
    typeof input.email !== 'string' ||
    !EMAIL_REGEX.test(input.email.trim())
  ) {
    throw new ApiError(
      400,
      'email must be a valid email address.'
    );
  }

  const id = normalizeOptionalText(input.id, 'id', 36);

  if (id) {
    assertUuid(id, 'id');
  }

  try {
    const profile = await prisma.profile.create({
      data: {
        ...(id ? { id } : {}),
        email: input.email.trim().toLowerCase(),
        displayName: normalizeOptionalText(
          input.displayName,
          'displayName',
          120
        )
      }
    });

    return serializeProfile(profile);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      throw new ApiError(
        409,
        'A profile with that email already exists.'
      );
    }

    throw error;
  }
}

export async function readProfile(profileId: string) {
  assertUuid(profileId, 'profileId');

  const profile = await prisma.profile.findUnique({
    where: { id: profileId }
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  return serializeProfile(profile);
}
