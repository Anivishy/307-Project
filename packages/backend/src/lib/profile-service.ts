import type { Profile } from '../generated/prisma';
import { ApiError } from './api-error';
import {
  normalizeEmail,
  normalizeNullableText,
  normalizeOptionalText
} from './input-normalization';
import { prisma } from './prisma';
import { isPrismaError } from './prisma-utils';
import { assertUuid } from './request-user';

const DISPLAY_NAME_MAX_LENGTH = 120;
const PROFILE_PICTURE_URL_MAX_LENGTH = 2048;
const PROFILE_PICTURE_STORAGE_REF_MAX_LENGTH = 512;
export const PROFILE_PICTURE_MAX_SIZE_BYTES =
  5 * 1024 * 1024;
const PROFILE_PICTURE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];
const PROFILE_PICTURE_CONTENT_TYPE_SET = new Set(
  PROFILE_PICTURE_CONTENT_TYPES
);

// Profile service = user persistence for the SRD's sign-in/session story.
// Routes stay thin by delegating validation, Prisma calls, and serialization here.
type ProfileCreateInput = {
  id?: unknown;
  email?: unknown;
  displayName?: unknown;
};

type ProfileUpdateInput = {
  displayName?: unknown;
  profilePicture?: unknown;
  profilePictureUrl?: unknown;
  profilePictureStorageRef?: unknown;
  profilePictureContentType?: unknown;
  profilePictureSizeBytes?: unknown;
};

type ProfilePictureData = {
  profilePictureUrl: string | null;
  profilePictureStorageRef: string | null;
  profilePictureContentType: string | null;
  profilePictureSizeBytes: number | null;
};

function serializeProfile(profile: Profile) {
  // Convert Date objects to ISO strings so API responses are plain JSON.
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    profilePictureUrl: profile.profilePictureUrl,
    profilePictureStorageRef: profile.profilePictureStorageRef,
    profilePictureContentType: profile.profilePictureContentType,
    profilePictureSizeBytes: profile.profilePictureSizeBytes,
    allergies: profile.allergies,
    medicalRestrictions: profile.medicalRestrictions,
    neverIncludeIngredientIds:
      profile.neverIncludeIngredientIds,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}

async function rekeyProfileReferences(
  fromProfileId: string,
  toProfileId: string
) {
  if (fromProfileId === toProfileId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.groupMember.updateMany({
      where: { profileId: fromProfileId },
      data: { profileId: toProfileId }
    });
    await tx.ingredient.updateMany({
      where: { ownerId: fromProfileId },
      data: { ownerId: toProfileId }
    });
    await tx.menuRequest.updateMany({
      where: { requestedById: fromProfileId },
      data: { requestedById: toProfileId }
    });
    await tx.recipeIngredient.updateMany({
      where: { fromProfileId },
      data: { fromProfileId: toProfileId }
    });
    await tx.group.updateMany({
      where: { ownerId: fromProfileId },
      data: { ownerId: toProfileId }
    });
    await tx.profile.update({
      where: { id: fromProfileId },
      data: { id: toProfileId }
    });
  });
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOwn(
  value: Record<string, unknown>,
  key: string
) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function readProvidedValue(
  value: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    if (hasOwn(value, key)) {
      return value[key];
    }
  }

  return undefined;
}

function validateProfilePictureUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(
      400,
      'profilePicture.url must be a valid URL.'
    );
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ApiError(
      400,
      'profilePicture.url must use http or https.'
    );
  }
}

function validateProfilePictureStorageRef(
  storageRef: string
) {
  if (
    storageRef.startsWith('/') ||
    storageRef.includes('..') ||
    storageRef.includes('\\') ||
    storageRef.includes('//') ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(storageRef)
  ) {
    throw new ApiError(
      400,
      'profilePicture.storageRef must be a valid storage path.'
    );
  }
}

function normalizeProfilePictureContentType(
  value: unknown
) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(
      400,
      'profilePicture.contentType is required.'
    );
  }

  const contentType = value.trim().toLowerCase();

  if (!PROFILE_PICTURE_CONTENT_TYPE_SET.has(contentType)) {
    throw new ApiError(
      400,
      `profilePicture.contentType must be one of ${PROFILE_PICTURE_CONTENT_TYPES.join(', ')}.`
    );
  }

  return contentType;
}

function normalizeProfilePictureSizeBytes(value: unknown) {
  const parsed =
    typeof value === 'string' && value.trim().length > 0
      ? Number(value)
      : value;

  if (
    typeof parsed !== 'number' ||
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > PROFILE_PICTURE_MAX_SIZE_BYTES
  ) {
    throw new ApiError(
      400,
      `profilePicture.sizeBytes must be between 1 and ${PROFILE_PICTURE_MAX_SIZE_BYTES}.`
    );
  }

  return parsed;
}

function buildTopLevelProfilePictureInput(
  input: Record<string, unknown>
) {
  const profilePicture: Record<string, unknown> = {};

  if (hasOwn(input, 'profilePictureUrl')) {
    profilePicture.url = input.profilePictureUrl;
  }

  if (hasOwn(input, 'profilePictureStorageRef')) {
    profilePicture.storageRef = input.profilePictureStorageRef;
  }

  if (hasOwn(input, 'profilePictureContentType')) {
    profilePicture.contentType = input.profilePictureContentType;
  }

  if (hasOwn(input, 'profilePictureSizeBytes')) {
    profilePicture.sizeBytes = input.profilePictureSizeBytes;
  }

  return profilePicture;
}

function normalizeProfilePictureUpdate(
  input: Record<string, unknown>
): ProfilePictureData | undefined {
  const hasNestedProfilePicture = hasOwn(
    input,
    'profilePicture'
  );
  const hasTopLevelProfilePicture = [
    'profilePictureUrl',
    'profilePictureStorageRef',
    'profilePictureContentType',
    'profilePictureSizeBytes'
  ].some((key) => hasOwn(input, key));

  if (!hasNestedProfilePicture && !hasTopLevelProfilePicture) {
    return undefined;
  }

  const profilePicture = hasNestedProfilePicture
    ? input.profilePicture
    : buildTopLevelProfilePictureInput(input);

  if (profilePicture === null) {
    return {
      profilePictureUrl: null,
      profilePictureStorageRef: null,
      profilePictureContentType: null,
      profilePictureSizeBytes: null
    };
  }

  if (!isRecord(profilePicture)) {
    throw new ApiError(
      400,
      'profilePicture must be an object or null.'
    );
  }

  const url = normalizeNullableText(
    readProvidedValue(profilePicture, ['url']),
    'profilePicture.url',
    PROFILE_PICTURE_URL_MAX_LENGTH
  );
  const storageRef = normalizeNullableText(
    readProvidedValue(profilePicture, ['storageRef']),
    'profilePicture.storageRef',
    PROFILE_PICTURE_STORAGE_REF_MAX_LENGTH
  );

  if (url) {
    validateProfilePictureUrl(url);
  }

  if (storageRef) {
    validateProfilePictureStorageRef(storageRef);
  }

  if (!url && !storageRef) {
    const isClearingPicture =
      url === null ||
      storageRef === null ||
      hasOwn(profilePicture, 'url') ||
      hasOwn(profilePicture, 'storageRef');

    if (isClearingPicture) {
      return {
        profilePictureUrl: null,
        profilePictureStorageRef: null,
        profilePictureContentType: null,
        profilePictureSizeBytes: null
      };
    }

    throw new ApiError(
      400,
      'profilePicture.url or profilePicture.storageRef is required.'
    );
  }

  return {
    profilePictureUrl: url ?? null,
    profilePictureStorageRef: storageRef ?? null,
    profilePictureContentType:
      normalizeProfilePictureContentType(
        readProvidedValue(profilePicture, ['contentType'])
      ),
    profilePictureSizeBytes:
      normalizeProfilePictureSizeBytes(
        readProvidedValue(profilePicture, ['sizeBytes'])
      )
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
          DISPLAY_NAME_MAX_LENGTH
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
    DISPLAY_NAME_MAX_LENGTH
  );

  try {
    if (id) {
      const existingProfile = await prisma.profile.findUnique({
        where: { email }
      });

      if (existingProfile) {
        if (existingProfile.id !== id) {
          await rekeyProfileReferences(existingProfile.id, id);
        }

        const profile = await prisma.profile.update({
          where: { id },
          data: {
            email,
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

export async function updateProfileIdentity(
  profileId: string,
  input: ProfileUpdateInput
) {
  assertUuid(profileId, 'authenticated user id');

  if (!isRecord(input)) {
    throw new ApiError(
      400,
      'Profile update body must be an object.'
    );
  }

  const data: {
    displayName?: string | null;
  } & Partial<ProfilePictureData> = {};

  if (hasOwn(input, 'displayName')) {
    data.displayName = normalizeNullableText(
      input.displayName,
      'displayName',
      DISPLAY_NAME_MAX_LENGTH
    );
  }

  Object.assign(data, normalizeProfilePictureUpdate(input));

  if (Object.keys(data).length === 0) {
    throw new ApiError(
      400,
      'At least one profile field must be provided.'
    );
  }

  try {
    const profile = await prisma.profile.update({
      where: { id: profileId },
      data
    });

    return serializeProfile(profile);
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      throw new ApiError(404, 'Profile not found.');
    }

    throw error;
  }
}

export async function updateProfileEmail(
  profileId: string,
  email: string
) {
  assertUuid(profileId, 'authenticated user id');

  try {
    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: { email: normalizeEmail(email) }
    });

    return serializeProfile(profile);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      throw new ApiError(
        409,
        'A profile with that email already exists.'
      );
    }

    if (isPrismaError(error, 'P2025')) {
      throw new ApiError(404, 'Profile not found.');
    }

    throw error;
  }
}

export async function anonymizeProfileForAccountDeletion(
  profileId: string
) {
  assertUuid(profileId, 'authenticated user id');

  try {
    await prisma.$transaction([
      prisma.ingredient.deleteMany({
        where: { ownerId: profileId }
      }),
      prisma.groupMember.deleteMany({
        where: { profileId }
      }),
      prisma.profile.update({
        where: { id: profileId },
        data: {
          email: `deleted-${profileId}@deleted.local`,
          displayName: 'Deleted account',
          profilePictureUrl: null,
          profilePictureStorageRef: null,
          profilePictureContentType: null,
          profilePictureSizeBytes: null,
          allergies: [],
          medicalRestrictions: [],
          neverIncludeIngredientIds: []
        }
      })
    ]);

    return {
      profileId,
      membershipsRemoved: true,
      profileAnonymized: true
    };
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      throw new ApiError(404, 'Profile not found.');
    }

    throw error;
  }
}
