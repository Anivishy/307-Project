import { apiFetch } from './api.js';
import {
  clearSession,
  updateSavedSession
} from './session.js';

function patchSessionFromProfile(profile) {
  updateSavedSession({
    profileId: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    profilePictureUrl: profile.profilePictureUrl,
    profilePictureStorageRef: profile.profilePictureStorageRef
  });
}

export async function fetchCurrentProfile() {
  return apiFetch('/api/profiles/me');
}

export async function updateProfileIdentity(updates) {
  const profile = await apiFetch('/api/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });

  patchSessionFromProfile(profile);
  return profile;
}

export async function requestEmailChange(newEmail) {
  const payload = await apiFetch(
    '/api/auth/email-change/request',
    {
      method: 'POST',
      body: JSON.stringify({ newEmail })
    }
  );

  if (payload.profile) {
    patchSessionFromProfile(payload.profile);
  }

  if (payload.requiresSignIn) {
    clearSession();
  }

  return payload;
}

export async function completeEmailChange(newEmail) {
  const payload = await apiFetch(
    '/api/auth/email-change/complete',
    {
      method: 'POST',
      body: JSON.stringify({ newEmail })
    }
  );

  if (payload.profile) {
    patchSessionFromProfile(payload.profile);
  }

  if (payload.requiresSignIn) {
    clearSession();
  }

  return payload;
}

export async function changeAccountPassword({
  currentPassword,
  newPassword
}) {
  const payload = await apiFetch('/api/auth/password/change', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });

  if (payload.requiresSignIn) {
    clearSession();
  }

  return payload;
}

export async function deleteAccount({
  currentPassword,
  confirmation
}) {
  const payload = await apiFetch('/api/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ currentPassword, confirmation })
  });

  if (payload.accountDeleted) {
    clearSession();
  }

  return payload;
}
