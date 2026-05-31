import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE as deleteAccountRoute } from '../app/api/auth/account/route';
import { POST as postEmailChangeRequest } from '../app/api/auth/email-change/request/route';
import { POST as postPasswordChange } from '../app/api/auth/password/change/route';
import {
  changePassword,
  completeEmailChange,
  deleteAccount,
  requestEmailChange
} from './auth-service';
import {
  anonymizeProfileForAccountDeletion,
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
  verifySupabaseEmailOtp
} from './supabase-auth';

vi.mock('./profile-service', () => ({
  anonymizeProfileForAccountDeletion: vi.fn(),
  findOrCreateProfileForEmail: vi.fn(),
  updateProfileEmail: vi.fn()
}));

vi.mock('./supabase-auth', () => ({
  deleteSupabaseAuthUser: vi.fn(),
  getSupabaseUserFromAccessToken: vi.fn(),
  hasSupabaseAuthUserWithEmail: vi.fn(),
  refreshSupabaseSession: vi.fn(),
  requestSupabaseEmailOtp: vi.fn(),
  requestSupabaseMagicLink: vi.fn(),
  revokeSupabaseSessions: vi.fn(),
  signInSupabaseWithPassword: vi.fn(),
  signUpSupabaseWithPassword: vi.fn(),
  updateSupabaseUser: vi.fn(),
  verifySupabaseEmailOtp: vi.fn()
}));

const profileId = '11111111-1111-4111-8111-111111111111';
const oldEmail = 'kartik@example.com';
const newEmail = 'avery@example.com';

const profile = {
  id: profileId,
  email: newEmail,
  displayName: 'Avery',
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

function authUser(email = oldEmail) {
  return {
    id: profileId,
    email,
    user_metadata: {}
  };
}

function reauthSession() {
  return {
    access_token: 'fresh-access-token',
    refresh_token: 'fresh-refresh-token',
    expires_in: 3600,
    expires_at: 1770000000,
    token_type: 'bearer',
    user: authUser()
  };
}

describe('US16 sensitive account flows', () => {
  beforeEach(() => {
    vi.mocked(getSupabaseUserFromAccessToken).mockReset();
    vi.mocked(hasSupabaseAuthUserWithEmail).mockReset();
    vi.mocked(hasSupabaseAuthUserWithEmail).mockResolvedValue(
      false
    );
    vi.mocked(updateSupabaseUser).mockReset();
    vi.mocked(signInSupabaseWithPassword).mockReset();
    vi.mocked(revokeSupabaseSessions).mockReset();
    vi.mocked(deleteSupabaseAuthUser).mockReset();
    vi.mocked(updateProfileEmail).mockReset();
    vi.mocked(anonymizeProfileForAccountDeletion).mockReset();
    vi.mocked(requestSupabaseEmailOtp).mockReset();
    vi.mocked(requestSupabaseMagicLink).mockReset();
    vi.mocked(signUpSupabaseWithPassword).mockReset();
    vi.mocked(verifySupabaseEmailOtp).mockReset();
    vi.mocked(refreshSupabaseSession).mockReset();
  });

  it('starts an email change without applying the local email until Supabase verifies it', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      authUser()
    );
    vi.mocked(updateSupabaseUser).mockResolvedValue(authUser());

    const payload = await requestEmailChange(
      'access-token',
      { newEmail: 'Avery@Example.com' }
    );

    expect(hasSupabaseAuthUserWithEmail).toHaveBeenCalledWith(
      newEmail
    );
    expect(updateSupabaseUser).toHaveBeenCalledWith(
      'access-token',
      { email: newEmail }
    );
    expect(updateProfileEmail).not.toHaveBeenCalled();
    expect(revokeSupabaseSessions).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      status: 'verificationRequired',
      email: newEmail,
      sessionsRevoked: false
    });
  });

  it('rejects email changes to an already-used address', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      authUser()
    );
    vi.mocked(hasSupabaseAuthUserWithEmail).mockResolvedValue(
      true
    );

    await expect(
      requestEmailChange('access-token', {
        newEmail
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'An account already exists for this email.'
    });
    expect(updateSupabaseUser).not.toHaveBeenCalled();
  });

  it('completes a verified email change, updates the local profile, and revokes sessions', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      authUser(newEmail)
    );
    vi.mocked(updateProfileEmail).mockResolvedValue(profile);

    const payload = await completeEmailChange(
      'verified-access-token',
      { newEmail }
    );

    expect(updateProfileEmail).toHaveBeenCalledWith(
      profileId,
      newEmail
    );
    expect(revokeSupabaseSessions).toHaveBeenCalledWith(
      'verified-access-token',
      'global'
    );
    expect(payload).toMatchObject({
      status: 'changed',
      email: newEmail,
      sessionsRevoked: true,
      requiresSignIn: true
    });
  });

  it('refuses to complete an email change before the new email is verified', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      authUser(oldEmail)
    );

    await expect(
      completeEmailChange('access-token', { newEmail })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'New email has not been verified yet.'
    });
    expect(updateProfileEmail).not.toHaveBeenCalled();
    expect(revokeSupabaseSessions).not.toHaveBeenCalled();
  });

  it('changes a password after current-password reauthentication and revokes sessions', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      authUser()
    );
    vi.mocked(signInSupabaseWithPassword).mockResolvedValue(
      reauthSession()
    );
    vi.mocked(updateSupabaseUser).mockResolvedValue(authUser());

    const payload = await changePassword('access-token', {
      currentPassword: 'current-secret',
      newPassword: 'new-secret'
    });

    expect(signInSupabaseWithPassword).toHaveBeenCalledWith(
      oldEmail,
      'current-secret'
    );
    expect(updateSupabaseUser).toHaveBeenCalledWith(
      'fresh-access-token',
      { password: 'new-secret' }
    );
    expect(revokeSupabaseSessions).toHaveBeenCalledWith(
      'fresh-access-token',
      'global'
    );
    expect(payload).toMatchObject({
      passwordUpdated: true,
      sessionsRevoked: true,
      requiresSignIn: true
    });
  });

  it('rejects weak new passwords before reauthentication or saving', async () => {
    await expect(
      changePassword('access-token', {
        currentPassword: 'current-secret',
        newPassword: 'short'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'newPassword must be at least 8 characters.'
    });

    expect(signInSupabaseWithPassword).not.toHaveBeenCalled();
    expect(updateSupabaseUser).not.toHaveBeenCalled();
    expect(revokeSupabaseSessions).not.toHaveBeenCalled();
  });

  it('requires the current password before changing passwords', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      authUser()
    );

    await expect(
      changePassword('access-token', {
        newPassword: 'new-secret'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'currentPassword is required.'
    });

    expect(signInSupabaseWithPassword).not.toHaveBeenCalled();
    expect(updateSupabaseUser).not.toHaveBeenCalled();
    expect(revokeSupabaseSessions).not.toHaveBeenCalled();
  });

  it('deletes an account after explicit confirmation and recent password reauthentication', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      authUser()
    );
    vi.mocked(signInSupabaseWithPassword).mockResolvedValue(
      reauthSession()
    );
    vi.mocked(anonymizeProfileForAccountDeletion).mockResolvedValue(
      {
        profileId,
        membershipsRemoved: true,
        profileAnonymized: true
      }
    );

    const payload = await deleteAccount('access-token', {
      currentPassword: 'current-secret',
      confirmation: oldEmail
    });

    expect(revokeSupabaseSessions).toHaveBeenCalledWith(
      'fresh-access-token',
      'global'
    );
    expect(deleteSupabaseAuthUser).toHaveBeenCalledWith(profileId);
    expect(anonymizeProfileForAccountDeletion).toHaveBeenCalledWith(
      profileId
    );
    expect(payload).toMatchObject({
      accountDeleted: true,
      sessionsRevoked: true,
      membershipsRemoved: true,
      profileAnonymized: true
    });
  });

  it('rejects account deletion unless confirmation matches the account email', async () => {
    vi.mocked(getSupabaseUserFromAccessToken).mockResolvedValue(
      authUser()
    );

    await expect(
      deleteAccount('access-token', {
        currentPassword: 'current-secret',
        confirmation: 'DELETE'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'confirmation must match the account email.'
    });

    expect(signInSupabaseWithPassword).not.toHaveBeenCalled();
    expect(deleteSupabaseAuthUser).not.toHaveBeenCalled();
    expect(anonymizeProfileForAccountDeletion).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated sensitive account requests before calling Supabase', async () => {
    const emailResponse = await postEmailChangeRequest(
      new Request(
        'http://localhost/api/auth/email-change/request',
        {
          method: 'POST',
          body: JSON.stringify({ newEmail })
        }
      )
    );
    const passwordResponse = await postPasswordChange(
      new Request('http://localhost/api/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: 'current-secret',
          newPassword: 'new-secret'
        })
      })
    );
    const deleteResponse = await deleteAccountRoute(
      new Request('http://localhost/api/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({
          currentPassword: 'current-secret',
          confirmation: oldEmail
        })
      })
    );

    expect(emailResponse.status).toBe(401);
    expect(passwordResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    await expect(emailResponse.json()).resolves.toMatchObject({
      error: {
        message: 'Missing Authorization bearer token.'
      }
    });
    expect(getSupabaseUserFromAccessToken).not.toHaveBeenCalled();
    expect(updateSupabaseUser).not.toHaveBeenCalled();
    expect(deleteSupabaseAuthUser).not.toHaveBeenCalled();
  });
});
