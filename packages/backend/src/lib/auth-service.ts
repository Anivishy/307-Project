import { ApiError } from './api-error';
import {
  findOrCreateProfileForEmail,
  findProfileByEmail
} from './profile-service';

const DEMO_OTP = '246810';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OtpRequestInput = {
  email?: unknown;
};

type OtpVerifyInput = {
  email?: unknown;
  otp?: unknown;
  displayName?: unknown;
};

type SessionProfileInput = {
  displayName?: unknown;
};

type SupabaseUserPayload = {
  id?: unknown;
  email?: unknown;
  user_metadata?: {
    display_name?: unknown;
    name?: unknown;
  };
};

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string' || !EMAIL_REGEX.test(value.trim())) {
    throw new ApiError(400, 'email must be a valid email address.');
  }

  return value.trim().toLowerCase();
}

function normalizeDisplayName(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, 'displayName must be a string.');
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function getSupabaseAuthConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new ApiError(500, 'Supabase auth is not configured.');
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    supabasePublishableKey
  };
}

function normalizeBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing Supabase access token.');
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  if (!token) {
    throw new ApiError(401, 'Missing Supabase access token.');
  }

  return token;
}

async function readSupabaseUser(accessToken: string) {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseAuthConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabasePublishableKey,
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new ApiError(401, 'Invalid or expired Supabase session.');
  }

  const user = (await response.json()) as SupabaseUserPayload;

  return {
    id: typeof user.id === 'string' ? user.id : undefined,
    email: normalizeEmail(user.email),
    displayName: normalizeDisplayName(
      user.user_metadata?.display_name ?? user.user_metadata?.name
    )
  };
}

export function requestEmailOtp(input: OtpRequestInput) {
  const email = normalizeEmail(input.email);

  return {
    email,
    delivery: 'demo-email-preview',
    expiresInSeconds: 600,
    ...(process.env.NODE_ENV === 'production'
      ? {}
      : { otpPreview: DEMO_OTP })
  };
}

export async function verifyEmailOtp(input: OtpVerifyInput) {
  const email = normalizeEmail(input.email);

  if (typeof input.otp !== 'string' || input.otp !== DEMO_OTP) {
    throw new ApiError(401, 'Invalid or expired OTP.');
  }

  const profile = await findOrCreateProfileForEmail({
    email,
    displayName: normalizeDisplayName(input.displayName)
  });

  return {
    profile,
    session: {
      profileId: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      verifiedAt: new Date().toISOString()
    }
  };
}

export async function getAccountStatus(input: OtpRequestInput) {
  const email = normalizeEmail(input.email);
  const profile = await findProfileByEmail(email);

  return {
    email,
    exists: Boolean(profile)
  };
}

export async function createSessionProfile(
  input: SessionProfileInput,
  authorizationHeader: string | null
) {
  const accessToken = normalizeBearerToken(authorizationHeader);
  const user = await readSupabaseUser(accessToken);
  const displayName =
    normalizeDisplayName(input.displayName) ?? user.displayName;
  const profile = await findOrCreateProfileForEmail({
    email: user.email,
    displayName
  });

  return {
    profile,
    session: {
      profileId: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      supabaseUserId: user.id,
      verifiedAt: new Date().toISOString()
    }
  };
}
