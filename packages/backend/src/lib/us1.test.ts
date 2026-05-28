import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import {
  completeMagicLinkSession,
  refreshSession,
  requestEmailOtp,
  requestMagicLink,
  signInWithPassword,
  signUpWithPassword,
  verifyEmailOtp
} from './auth-service';
import { findOrCreateProfileForEmail } from './profile-service';
import { getRequestUserId } from './request-user';
import {
  getSupabaseUserFromAccessToken,
  hasSupabaseAuthUserWithEmail,
  refreshSupabaseSession,
  requestSupabaseEmailOtp,
  requestSupabaseMagicLink,
  signInSupabaseWithPassword,
  signUpSupabaseWithPassword,
  verifySupabaseEmailOtp
} from './supabase-auth';

vi.mock('./profile-service', () => ({
  findOrCreateProfileForEmail: vi.fn()
}));

vi.mock('./supabase-auth', () => ({
  getSupabaseUserFromAccessToken: vi.fn(),
  hasSupabaseAuthUserWithEmail: vi.fn(),
  refreshSupabaseSession: vi.fn(),
  requestSupabaseEmailOtp: vi.fn(),
  requestSupabaseMagicLink: vi.fn(),
  signInSupabaseWithPassword: vi.fn(),
  signUpSupabaseWithPassword: vi.fn(),
  verifySupabaseEmailOtp: vi.fn()
}));

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'kartik@example.com',
  displayName: 'Kartik',
  profilePictureUrl: null,
  profilePictureStorageRef: null,
  profilePictureContentType: null,
  profilePictureSizeBytes: null,
  allergies: [],
  medicalRestrictions: [],
  neverIncludeIngredientIds: [],
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z'
};

describe('US1 Supabase email OTP auth', () => {
  beforeEach(() => {
    vi.mocked(findOrCreateProfileForEmail).mockReset();
    vi.mocked(hasSupabaseAuthUserWithEmail).mockReset();
    vi.mocked(hasSupabaseAuthUserWithEmail).mockResolvedValue(
      false
    );
    vi.mocked(requestSupabaseEmailOtp).mockReset();
    vi.mocked(requestSupabaseMagicLink).mockReset();
    vi.mocked(signInSupabaseWithPassword).mockReset();
    vi.mocked(signUpSupabaseWithPassword).mockReset();
    vi.mocked(verifySupabaseEmailOtp).mockReset();
    vi.mocked(refreshSupabaseSession).mockReset();
    vi.mocked(getSupabaseUserFromAccessToken).mockReset();
  });

  it('creates an account with email and password through Supabase Auth', async () => {
    vi.mocked(signUpSupabaseWithPassword).mockResolvedValue({
      access_token: 'signup-access-token',
      refresh_token: 'signup-refresh-token',
      expires_in: 3600,
      expires_at: 1770000000,
      token_type: 'bearer',
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: {}
      }
    });
    vi.mocked(findOrCreateProfileForEmail).mockResolvedValue(
      profile
    );

    const payload = await signUpWithPassword({
      email: 'Kartik@Example.com',
      password: 'correct-horse',
      displayName: 'Kartik',
      redirectTo: 'http://localhost:5173/auth/callback'
    });

    expect(signUpSupabaseWithPassword).toHaveBeenCalledWith({
      email: 'kartik@example.com',
      password: 'correct-horse',
      displayName: 'Kartik',
      redirectTo: 'http://localhost:5173/auth/callback'
    });
    expect(findOrCreateProfileForEmail).toHaveBeenCalledWith({
      id: profile.id,
      email: profile.email,
      displayName: 'Kartik'
    });
    expect(payload.session).toMatchObject({
      accessToken: 'signup-access-token',
      refreshToken: 'signup-refresh-token'
    });
  });

  it('returns a confirmation-required signup state when Supabase does not create a session yet', async () => {
    vi.mocked(signUpSupabaseWithPassword).mockResolvedValue(
      null
    );

    const payload = await signUpWithPassword({
      email: 'Kartik@Example.com',
      password: 'correct-horse',
      displayName: 'Kartik',
      redirectTo: 'http://localhost:5173/auth/callback'
    });

    expect(payload).toMatchObject({
      email: 'kartik@example.com',
      provider: 'supabase',
      requiresEmailConfirmation: true
    });
    expect(findOrCreateProfileForEmail).not.toHaveBeenCalled();
  });

  it('requires a display name before creating an auth user', async () => {
    await expect(
      signUpWithPassword({
        email: 'kartik@example.com',
        password: 'correct-horse',
        redirectTo: 'http://localhost:5173/auth/callback'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'displayName is required.'
    });
    expect(signUpSupabaseWithPassword).not.toHaveBeenCalled();
  });

  it('rejects signup before calling Supabase signup when the auth user already exists', async () => {
    vi.mocked(hasSupabaseAuthUserWithEmail).mockResolvedValue(
      true
    );

    await expect(
      signUpWithPassword({
        email: 'kartik@example.com',
        password: 'correct-horse',
        displayName: 'Kartik',
        redirectTo: 'http://localhost:5173/auth/callback'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'An account already exists for this email.'
    });
    expect(signUpSupabaseWithPassword).not.toHaveBeenCalled();
  });

  it('does not create a local profile when Supabase reports an existing auth user', async () => {
    vi.mocked(signUpSupabaseWithPassword).mockRejectedValue(
      new ApiError(409, 'User already registered')
    );

    await expect(
      signUpWithPassword({
        email: 'kartik@example.com',
        password: 'correct-horse',
        displayName: 'Kartik',
        redirectTo: 'http://localhost:5173/auth/callback'
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'User already registered'
    });
    expect(findOrCreateProfileForEmail).not.toHaveBeenCalled();
  });

  it('signs in with email and password through Supabase Auth', async () => {
    vi.mocked(signInSupabaseWithPassword).mockResolvedValue({
      access_token: 'signin-access-token',
      refresh_token: 'signin-refresh-token',
      expires_in: 3600,
      expires_at: 1770000000,
      token_type: 'bearer',
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: {}
      }
    });
    vi.mocked(findOrCreateProfileForEmail).mockResolvedValue(
      profile
    );

    const payload = await signInWithPassword({
      email: 'Kartik@Example.com',
      password: 'correct-horse'
    });

    expect(signInSupabaseWithPassword).toHaveBeenCalledWith(
      'kartik@example.com',
      'correct-horse'
    );
    expect(payload.session).toMatchObject({
      accessToken: 'signin-access-token',
      refreshToken: 'signin-refresh-token'
    });
  });

  it('requests a magic link with the frontend callback redirect', async () => {
    const payload = await requestMagicLink({
      email: 'Kartik@Example.com',
      redirectTo: 'http://localhost:5173/auth/callback'
    });

    expect(requestSupabaseMagicLink).toHaveBeenCalledWith(
      'kartik@example.com',
      'http://localhost:5173/auth/callback'
    );
    expect(payload).toMatchObject({
      email: 'kartik@example.com',
      delivery: 'supabase-magic-link',
      provider: 'supabase'
    });
  });

  it('requests a one-time code through Supabase Auth for a valid email', async () => {
    const payload = await requestEmailOtp({
      email: 'Kartik@Example.com'
    });

    expect(requestSupabaseEmailOtp).toHaveBeenCalledWith(
      'kartik@example.com'
    );
    expect(payload).toMatchObject({
      email: 'kartik@example.com',
      delivery: 'supabase-email-otp',
      provider: 'supabase'
    });
  });

  it('verifies the OTP and creates or finds the Supabase-backed profile', async () => {
    vi.mocked(verifySupabaseEmailOtp).mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      expires_at: 1770000000,
      token_type: 'bearer',
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: {}
      }
    });
    vi.mocked(findOrCreateProfileForEmail).mockResolvedValue(
      profile
    );

    const payload = await verifyEmailOtp({
      email: 'kartik@example.com',
      otp: '246810',
      displayName: 'Kartik'
    });

    expect(findOrCreateProfileForEmail).toHaveBeenCalledWith({
      id: profile.id,
      email: 'kartik@example.com',
      displayName: 'Kartik'
    });
    expect(payload.session).toMatchObject({
      profileId: profile.id,
      email: profile.email,
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    });
  });

  it('rejects an invalid OTP before creating a local profile session', async () => {
    vi.mocked(verifySupabaseEmailOtp).mockRejectedValue(
      new ApiError(401, 'Invalid or expired OTP.')
    );

    await expect(
      verifyEmailOtp({
        email: 'kartik@example.com',
        otp: '000000'
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired OTP.'
    });
    expect(findOrCreateProfileForEmail).not.toHaveBeenCalled();
  });

  it('completes a magic-link session and creates or finds the Supabase-backed profile', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      {
        id: profile.id,
        email: profile.email,
        user_metadata: {}
      }
    );
    vi.mocked(findOrCreateProfileForEmail).mockResolvedValue(
      profile
    );

    const payload = await completeMagicLinkSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'bearer',
      expiresIn: 3600,
      expiresAt: 1770000000
    });

    expect(getSupabaseUserFromAccessToken).toHaveBeenCalledWith(
      'access-token'
    );
    expect(findOrCreateProfileForEmail).toHaveBeenCalledWith({
      id: profile.id,
      email: profile.email,
      displayName: undefined
    });
    expect(payload.session).toMatchObject({
      profileId: profile.id,
      email: profile.email,
      accessToken: 'access-token',
      refreshToken: 'refresh-token'
    });
  });

  it('resolves protected API users from Supabase bearer tokens', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      {
        id: profile.id,
        email: profile.email
      }
    );

    const userId = await getRequestUserId(
      new Request('http://localhost/api/groups', {
        headers: { authorization: 'Bearer access-token' }
      })
    );

    expect(getSupabaseUserFromAccessToken).toHaveBeenCalledWith(
      'access-token'
    );
    expect(userId).toBe(profile.id);
  });

  it('refreshes an existing Supabase session and re-saves the local profile session', async () => {
    vi.mocked(refreshSupabaseSession).mockResolvedValue({
      access_token: 'refreshed-access-token',
      refresh_token: 'refreshed-refresh-token',
      expires_in: 3600,
      expires_at: 1770003600,
      token_type: 'bearer',
      user: {
        id: profile.id,
        email: profile.email,
        user_metadata: {}
      }
    });
    vi.mocked(findOrCreateProfileForEmail).mockResolvedValue(
      profile
    );

    const payload = await refreshSession({
      refreshToken: 'old-refresh-token'
    });

    expect(refreshSupabaseSession).toHaveBeenCalledWith(
      'old-refresh-token'
    );
    expect(payload.session).toMatchObject({
      accessToken: 'refreshed-access-token',
      refreshToken: 'refreshed-refresh-token'
    });
  });
});
