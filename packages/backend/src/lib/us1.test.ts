import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  requestEmailOtp,
  verifyEmailOtp
} from './auth-service';
import { findOrCreateProfileForEmail } from './profile-service';

vi.mock('./profile-service', () => ({
  findOrCreateProfileForEmail: vi.fn()
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
});
