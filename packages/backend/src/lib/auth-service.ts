import { ApiError } from './api-error';
import {
  normalizeEmail,
  normalizeOptionalText
} from './input-normalization';
import { findOrCreateProfileForEmail } from './profile-service';
import {
  getSupabaseUserFromAccessToken,
  hasSupabaseAuthUserWithEmail,
  refreshSupabaseSession,
  requestSupabaseEmailOtp,
  requestSupabaseMagicLink,
  signInSupabaseWithPassword,
  signUpSupabaseWithPassword,
  verifySupabaseEmailOtp,
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

function normalizePassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 8) {
    throw new ApiError(
      400,
      'password must be at least 8 characters.'
    );
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
