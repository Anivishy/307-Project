import type { Profile } from '../generated/prisma';
import { ApiError } from './api-error';
import {
  normalizeEmail,
  normalizeOptionalText
} from './input-normalization';
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

function serializeProfile(profile: Profile) {
  // Convert Date objects to ISO strings so API responses are plain JSON.
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    allergies: profile.allergies,
    medicalRestrictions: profile.medicalRestrictions,
    neverIncludeIngredientIds:
      profile.neverIncludeIngredientIds,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

export async function createProfile(input: ProfileCreateInput) {
  const email = normalizeEmail(input.email);
  const id = normalizeOptionalText(input.id, 'id', 36);

  if (id) {
    assertUuid(id, 'id');
  }

  try {
    const profile = await prisma.profile.create({
      data: {
        ...(id ? { id } : {}),
        email,
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

export async function findOrCreateProfileForEmail(
  input: ProfileCreateInput
) {
  const email = normalizeEmail(input.email);
  const id = normalizeOptionalText(input.id, 'id', 36);

  if (id) {
    assertUuid(id, 'id');
  }

  const displayName = normalizeOptionalText(
    input.displayName,
    'displayName',
    120
  );

  try {
    if (id) {
      const existingProfile = await prisma.profile.findUnique({
        where: { email }
      });

      if (existingProfile) {
        const profile = await prisma.profile.update({
          where: { email },
          data: {
            id,
            ...(displayName ? { displayName } : {})
          }
        });

        return serializeProfile(profile);
      }
    }

    const profile = await prisma.profile.upsert({
      where: id ? { id } : { email },
      update: {
        email,
        ...(displayName ? { displayName } : {})
      },
      create: {
        ...(id ? { id } : {}),
        email,
        displayName
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
