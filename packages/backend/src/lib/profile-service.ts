import type { Profile } from '../generated/prisma';
import { ApiError, isPrismaError } from './api-error';
import { prisma } from './prisma';
import { assertUuid } from './request-user';

type ProfileRequestBody = {
  id?: unknown;
  email?: unknown;
  displayName?: unknown;
};

type NewProfile = {
  id?: string;
  email: string;
  displayName?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createProfile(input: ProfileRequestBody) {
  const fields = readNewProfile(input);

  try {
    const profile = await prisma.profile.create({
      data: fields
    });

    return formatProfile(profile);
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

export async function getProfile(profileId: string) {
  assertUuid(profileId, 'profileId');

  const profile = await prisma.profile.findUnique({
    where: { id: profileId }
  });

  if (!profile) {
    throw new ApiError(404, 'Profile not found.');
  }

  return formatProfile(profile);
}

function readNewProfile(input: ProfileRequestBody): NewProfile {
  if (
    typeof input.email !== 'string' ||
    !EMAIL_REGEX.test(input.email.trim())
  ) {
    throw new ApiError(
      400,
      'email must be a valid email address.'
    );
  }

  const fields: NewProfile = {
    email: input.email.trim().toLowerCase()
  };
  const id = readOptionalText(input.id, 'id', 36);
  const displayName = readOptionalText(
    input.displayName,
    'displayName',
    120
  );

  if (id) {
    assertUuid(id, 'id');
    fields.id = id;
  }

  if (displayName) {
    fields.displayName = displayName;
  }

  return fields;
}

function readOptionalText(
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

  const text = value.trim();
  if (text.length > maxLength) {
    throw new ApiError(
      400,
      `${fieldName} must be ${maxLength} characters or fewer.`
    );
  }

  return text || undefined;
}

function formatProfile(profile: Profile) {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}
