import type { Profile } from '../generated/prisma';
import { ApiError } from './api-error';
import { prisma } from './prisma';
import { isPrismaError } from './prisma-utils';
import { assertUuid } from './request-user';

// Profile service = user persistence for the SRD's sign-in/session story.
// Routes stay thin by delegating validation, Prisma calls, and serialization here.
type ProfileCreateInput = {
  id?: unknown;
  email?: unknown;
  displayName?: unknown;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  // Convert Date objects to ISO strings so API responses are plain JSON.
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    allergies: profile.allergies,
    medicalRestrictions: profile.medicalRestrictions,
    neverIncludeIngredientIds: profile.neverIncludeIngredientIds,
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
      // P2002 is Prisma's unique-constraint error; here it means duplicate email.
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
