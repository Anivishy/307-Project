import { ApiError } from './api-error';
import {
  normalizeEmail,
  normalizeOptionalText,
  normalizeRequiredText
} from './input-normalization';
import {
  anonymizeProfileForAccountDeletion,
  findOrCreateProfileForEmail,
  updateProfileEmail
} from './profile-service';
import {
  deleteSupabaseAuthUser,
  getSupabaseUserFromAccessToken,
  hasSupabaseAuthUserWithEmail,
  refreshSupabaseSession,
  requestSupabaseEmailOtp,
  requestSupabaseMagicLink,
  revokeSupabaseSessions,
  signInSupabaseWithPassword,
  signUpSupabaseWithPassword,
  updateSupabaseUser,
  verifySupabaseEmailOtp,
  type SupabaseAuthUser,
  type SupabaseAuthSession
} from './supabase-auth';

type OtpRequestInput = {
  email?: unknown;
  redirectTo?: unknown;
};

type OtpVerifyInput = {
  email?: unknown;
  otp?: unknown;
  displayName?: unknown;
};

type RefreshSessionInput = {
  refreshToken?: unknown;
};

type MagicLinkSessionInput = {
  accessToken?: unknown;
  refreshToken?: unknown;
  tokenType?: unknown;
  expiresIn?: unknown;
  expiresAt?: unknown;
};

type PasswordAuthInput = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
  redirectTo?: unknown;
};

type SignUpPasswordInput = PasswordAuthInput & {
  displayName?: unknown;
};

type EmailChangeInput = {
  email?: unknown;
  newEmail?: unknown;
};

type PasswordChangeInput = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

type AccountDeletionInput = {
  currentPassword?: unknown;
  confirmation?: unknown;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readAliasedValue(
  input: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return input[key];
    }
  }

  return undefined;
}

function normalizeRedirectTo(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, 'redirectTo is required.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError(400, 'redirectTo must be a valid URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ApiError(
      400,
      'redirectTo must use http or https.'
    );
  }

  if (url.pathname !== '/auth/callback') {
    throw new ApiError(
      400,
      'redirectTo must point to /auth/callback.'
    );
  }

  return url.toString();
}

function normalizeDisplayName(value: unknown) {
  return normalizeOptionalText(value, 'displayName', 120);
}

function normalizeRequiredDisplayName(value: unknown) {
  const displayName = normalizeDisplayName(value);

  if (!displayName) {
    throw new ApiError(400, 'displayName is required.');
  }

  return displayName;
}

function normalizePassword(
  value: unknown,
  fieldName = 'password'
) {
  if (typeof value !== 'string' || value.length < 8) {
    throw new ApiError(
      400,
      `${fieldName} must be at least 8 characters.`
    );
  }

  return value;
}

function normalizeCurrentPassword(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ApiError(400, 'currentPassword is required.');
  }

  return value;
}

function getMetadataDisplayName(session: SupabaseAuthSession) {
  const metadata = session.user.user_metadata;

  if (!metadata) {
    return undefined;
  }

  const name =
    metadata.name ??
    metadata.full_name ??
    metadata.display_name;
  return normalizeDisplayName(name);
}

function serializeSession(
  session: SupabaseAuthSession,
  profile: Awaited<
    ReturnType<typeof findOrCreateProfileForEmail>
  >
) {
  return {
    profileId: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    profilePictureUrl: profile.profilePictureUrl,
    profilePictureStorageRef: profile.profilePictureStorageRef,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    tokenType: session.token_type,
    expiresIn: session.expires_in,
    expiresAt:
      session.expires_at ??
      Math.floor(Date.now() / 1000) + session.expires_in,
    verifiedAt: new Date().toISOString()
  };
}

function normalizeRefreshToken(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, 'refreshToken is required.');
  }

  return value.trim();
}

function normalizeAccessToken(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, 'accessToken is required.');
  }

  return value.trim();
}

function normalizeTokenType(value: unknown) {
  if (value === undefined || value === null) {
    return 'bearer';
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(400, 'tokenType must be a string.');
  }

  return value.trim();
}

function normalizeExpiresIn(value: unknown) {
  const parsed =
    typeof value === 'string' ? Number(value) : value;

  if (
    typeof parsed !== 'number' ||
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    throw new ApiError(400, 'expiresIn must be a number.');
  }

  return parsed;
}

function normalizeExpiresAt(
  value: unknown,
  expiresIn: number
) {
  if (value === undefined || value === null || value === '') {
    return Math.floor(Date.now() / 1000) + expiresIn;
  }

  const parsed =
    typeof value === 'string' ? Number(value) : value;

  if (
    typeof parsed !== 'number' ||
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    throw new ApiError(400, 'expiresAt must be a number.');
  }

  return parsed;
}

function requireSessionEmail(session: SupabaseAuthSession) {
  if (
    typeof session.user.email !== 'string' ||
    session.user.email.trim().length === 0
  ) {
    throw new ApiError(
      502,
      'Supabase Auth returned a session without an email address.'
    );
  }

  return session.user.email;
}

function requireUserEmail(user: SupabaseAuthUser) {
  if (
    typeof user.email !== 'string' ||
    user.email.trim().length === 0
  ) {
    throw new ApiError(
      502,
      'Supabase Auth returned a user without an email address.'
    );
  }

  return user.email;
}

function normalizeSensitiveInput(input: unknown) {
  if (!isRecord(input)) {
    throw new ApiError(
      400,
      'Request body must be an object.'
    );
  }

  return input;
}

function normalizeEmailChangeTarget(input: EmailChangeInput) {
  const body = normalizeSensitiveInput(input);
  const value = readAliasedValue(body, ['newEmail', 'email']);

  if (value === undefined) {
    throw new ApiError(400, 'newEmail is required.');
  }

  return normalizeEmail(value);
}

function normalizeAccountConfirmation(
  value: unknown,
  email: string
) {
  const confirmation = normalizeRequiredText(
    value,
    'confirmation',
    320
  ).toLowerCase();

  if (confirmation !== email.trim().toLowerCase()) {
    throw new ApiError(
      400,
      'confirmation must match the account email.'
    );
  }
}

async function requirePasswordReauthentication(
  accessToken: string,
  input: PasswordChangeInput | AccountDeletionInput
) {
  const body = normalizeSensitiveInput(input);
  const user = await getSupabaseUserFromAccessToken(accessToken);
  const email = requireUserEmail(user);
  const session = await signInSupabaseWithPassword(
    email,
    normalizeCurrentPassword(body.currentPassword)
  );

  if (session.user.id !== user.id) {
    throw new ApiError(
      401,
      'Current password did not re-authenticate this account.'
    );
  }

  return { user, email, session };
}

export async function requestEmailOtp(input: OtpRequestInput) {
  const email = normalizeEmail(input.email);
  await requestSupabaseEmailOtp(email);

  return {
    email,
    delivery: 'supabase-email-otp',
    provider: 'supabase'
  };
}

export async function requestMagicLink(input: OtpRequestInput) {
  const email = normalizeEmail(input.email);
  await requestSupabaseMagicLink(
    email,
    normalizeRedirectTo(input.redirectTo)
  );

  return {
    email,
    delivery: 'supabase-magic-link',
    provider: 'supabase'
  };
}

export async function verifyEmailOtp(input: OtpVerifyInput) {
  const email = normalizeEmail(input.email);

  if (
    typeof input.otp !== 'string' ||
    input.otp.trim().length === 0
  ) {
    throw new ApiError(400, 'otp is required.');
  }

  const session = await verifySupabaseEmailOtp(
    email,
    input.otp.trim()
  );
  const profile = await findOrCreateProfileForEmail({
    id: session.user.id,
    email,
    displayName:
      normalizeDisplayName(input.displayName) ??
      getMetadataDisplayName(session)
  });

  return {
    profile,
    session: serializeSession(session, profile)
  };
}

export async function signUpWithPassword(
  input: SignUpPasswordInput
) {
  const email = normalizeEmail(input.email);
  const displayName = normalizeRequiredDisplayName(
    input.displayName
  );

  if (await hasSupabaseAuthUserWithEmail(email)) {
    throw new ApiError(
      409,
      'An account already exists for this email.'
    );
  }

  const session = await signUpSupabaseWithPassword({
    email,
    password: normalizePassword(input.password),
    displayName,
    redirectTo: normalizeRedirectTo(input.redirectTo)
  });

  if (!session) {
    return {
      email,
      provider: 'supabase',
      requiresEmailConfirmation: true
    };
  }

  const profile = await findOrCreateProfileForEmail({
    id: session.user.id,
    email: requireSessionEmail(session),
    displayName:
      displayName ?? getMetadataDisplayName(session)
  });

  return {
    profile,
    session: serializeSession(session, profile)
  };
}

export async function signInWithPassword(
  input: PasswordAuthInput
) {
  const session = await signInSupabaseWithPassword(
    normalizeEmail(input.email),
    normalizePassword(input.password)
  );
  const profile = await findOrCreateProfileForEmail({
    id: session.user.id,
    email: requireSessionEmail(session),
    displayName: getMetadataDisplayName(session)
  });

  return {
    profile,
    session: serializeSession(session, profile)
  };
}

export async function completeMagicLinkSession(
  input: MagicLinkSessionInput
) {
  const accessToken = normalizeAccessToken(input.accessToken);
  const refreshToken = normalizeRefreshToken(input.refreshToken);
  const expiresIn = normalizeExpiresIn(input.expiresIn);
  const session: SupabaseAuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires_at: normalizeExpiresAt(input.expiresAt, expiresIn),
    token_type: normalizeTokenType(input.tokenType),
    user: await getSupabaseUserFromAccessToken(accessToken)
  };
  const profile = await findOrCreateProfileForEmail({
    id: session.user.id,
    email: requireSessionEmail(session),
    displayName: getMetadataDisplayName(session)
  });

  return {
    profile,
    session: serializeSession(session, profile)
  };
}

export async function refreshSession(
  input: RefreshSessionInput
) {
  const session = await refreshSupabaseSession(
    normalizeRefreshToken(input.refreshToken)
  );
  const profile = await findOrCreateProfileForEmail({
    id: session.user.id,
    email: requireSessionEmail(session),
    displayName: getMetadataDisplayName(session)
  });

  return {
    profile,
    session: serializeSession(session, profile)
  };
}

export async function requestEmailChange(
  accessToken: string,
  input: EmailChangeInput
) {
  const user = await getSupabaseUserFromAccessToken(accessToken);
  const currentEmail = normalizeEmail(requireUserEmail(user));
  const newEmail = normalizeEmailChangeTarget(input);

  if (newEmail === currentEmail) {
    throw new ApiError(
      400,
      'newEmail must be different from the current email.'
    );
  }

  if (await hasSupabaseAuthUserWithEmail(newEmail)) {
    throw new ApiError(
      409,
      'An account already exists for this email.'
    );
  }

  const updatedUser = await updateSupabaseUser(accessToken, {
    email: newEmail
  });

  if (updatedUser.id !== user.id) {
    throw new ApiError(
      502,
      'Supabase Auth returned a different user for the email change.'
    );
  }

  const updatedEmail =
    typeof updatedUser.email === 'string'
      ? normalizeEmail(updatedUser.email)
      : null;

  if (updatedEmail === newEmail) {
    const profile = await updateProfileEmail(user.id, newEmail);
    await revokeSupabaseSessions(accessToken, 'global');

    return {
      status: 'changed',
      email: newEmail,
      profile,
      sessionsRevoked: true,
      requiresSignIn: true
    };
  }

  return {
    status: 'verificationRequired',
    email: newEmail,
    provider: 'supabase',
    sessionsRevoked: false
  };
}

export async function completeEmailChange(
  accessToken: string,
  input: EmailChangeInput
) {
  const user = await getSupabaseUserFromAccessToken(accessToken);
  const verifiedEmail = normalizeEmail(requireUserEmail(user));
  const expectedEmail = normalizeEmailChangeTarget(input);

  if (verifiedEmail !== expectedEmail) {
    throw new ApiError(
      409,
      'New email has not been verified yet.'
    );
  }

  const profile = await updateProfileEmail(
    user.id,
    verifiedEmail
  );
  await revokeSupabaseSessions(accessToken, 'global');

  return {
    status: 'changed',
    email: verifiedEmail,
    profile,
    sessionsRevoked: true,
    requiresSignIn: true
  };
}

export async function changePassword(
  accessToken: string,
  input: PasswordChangeInput
) {
  const body = normalizeSensitiveInput(input);
  const newPassword = normalizePassword(
    body.newPassword,
    'newPassword'
  );
  const { session } = await requirePasswordReauthentication(
    accessToken,
    body
  );

  await updateSupabaseUser(session.access_token, {
    password: newPassword
  });
  await revokeSupabaseSessions(session.access_token, 'global');

  return {
    passwordUpdated: true,
    sessionsRevoked: true,
    requiresSignIn: true
  };
}

export async function deleteAccount(
  accessToken: string,
  input: AccountDeletionInput
) {
  const body = normalizeSensitiveInput(input);
  const user = await getSupabaseUserFromAccessToken(accessToken);
  const email = requireUserEmail(user);

  normalizeAccountConfirmation(body.confirmation, email);

  const session = await signInSupabaseWithPassword(
    email,
    normalizeCurrentPassword(body.currentPassword)
  );

  if (session.user.id !== user.id) {
    throw new ApiError(
      401,
      'Current password did not re-authenticate this account.'
    );
  }

  await revokeSupabaseSessions(session.access_token, 'global');
  await deleteSupabaseAuthUser(user.id);
  const cleanup = await anonymizeProfileForAccountDeletion(
    user.id
  );

  return {
    accountDeleted: true,
    sessionsRevoked: true,
    ...cleanup
  };
}
