import { ApiError } from './api-error';
import { findOrCreateProfileForEmail } from './profile-service';

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
