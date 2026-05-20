import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSessionProfile,
  getAccountStatus,
  requestEmailOtp,
  verifyEmailOtp
} from './auth-service';
import {
  findOrCreateProfileForEmail,
  findProfileByEmail
} from './profile-service';

vi.mock('./profile-service', () => ({
  findOrCreateProfileForEmail: vi.fn(),
  findProfileByEmail: vi.fn()
}));

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'kartik@example.com',
  displayName: 'Kartik',
  allergies: [],
  medicalRestrictions: [],
  neverIncludeIngredientIds: [],
  createdAt: '2026-05-14T00:00:00.000Z',
  updatedAt: '2026-05-14T00:00:00.000Z'
};

describe('US1 email OTP auth', () => {
  beforeEach(() => {
    vi.mocked(findOrCreateProfileForEmail).mockReset();
    vi.mocked(findProfileByEmail).mockReset();
  });

  it('requests a one-time code for a valid email', () => {
    const payload = requestEmailOtp({
      email: 'Kartik@Example.com'
    });

    expect(payload).toMatchObject({
      email: 'kartik@example.com',
      delivery: 'demo-email-preview',
      expiresInSeconds: 600
    });
  });

  it('verifies the OTP and creates or finds the Supabase-backed profile', async () => {
    vi.mocked(findOrCreateProfileForEmail).mockResolvedValue(profile);

    const payload = await verifyEmailOtp({
      email: 'kartik@example.com',
      otp: '246810',
      displayName: 'Kartik'
    });

    expect(findOrCreateProfileForEmail).toHaveBeenCalledWith({
      email: 'kartik@example.com',
      displayName: 'Kartik'
    });
    expect(payload.session).toMatchObject({
      profileId: profile.id,
      email: profile.email
    });
  });

  it('rejects an invalid OTP before creating a session', async () => {
    await expect(
      verifyEmailOtp({
        email: 'kartik@example.com',
        otp: '000000'
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired OTP.'
    });
  });

  it('reports whether a profile already exists for signup validation', async () => {
    vi.mocked(findProfileByEmail).mockResolvedValue(profile);

    await expect(
      getAccountStatus({ email: 'Kartik@Example.com' })
    ).resolves.toEqual({
      email: 'kartik@example.com',
      exists: true
    });
  });

  it('creates the app session from a verified Supabase access token', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: 'supabase-user-1',
            email: 'Kartik@Example.com',
            user_metadata: { display_name: 'Kartik' }
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        )
      )
    );
    vi.mocked(findOrCreateProfileForEmail).mockResolvedValue(profile);

    const payload = await createSessionProfile(
      {},
      'Bearer access-token'
    );

    expect(findOrCreateProfileForEmail).toHaveBeenCalledWith({
      email: 'kartik@example.com',
      displayName: 'Kartik'
    });
    expect(payload.session).toMatchObject({
      profileId: profile.id,
      email: profile.email,
      supabaseUserId: 'supabase-user-1'
    });

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
