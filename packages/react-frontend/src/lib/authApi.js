import {
  clearSession,
  getSavedSession,
  getSessionRefreshToken,
  isSessionExpiringSoon,
  saveSession
} from './session.js';

async function readJson(response) {
  const payload = await response.json();

  if (!response.ok) {
    const message =
      payload.error?.message ??
      payload.error ??
      'Request failed.';

    if (
      response.status === 409 ||
      /already registered|already exists|user already/i.test(
        message
      )
    ) {
      throw new Error(
        'An account already exists for this email. Sign in with your password, or check your inbox if you just created it.'
      );
    }

    throw new Error(message);
  }

  return payload;
}

export async function signUpWithPassword({
  email,
  password,
  displayName
}) {
  const redirectTo = `${window.location.origin}/auth/callback`;
  const response = await fetch('/api/auth/password/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName,
      redirectTo
    })
  });
  const payload = await readJson(response);

  if (payload.session) {
    saveSession(payload.session);
  }
  return payload;
}

export async function signInWithPassword({ email, password }) {
  const response = await fetch('/api/auth/password/signin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const payload = await readJson(response);

  saveSession(payload.session);
  return payload;
}

export async function completeMagicLinkSession({
  accessToken,
  refreshToken,
  tokenType,
  expiresIn,
  expiresAt
}) {
  const response = await fetch('/api/auth/session/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      accessToken,
      refreshToken,
      tokenType,
      expiresIn,
      expiresAt
    })
  });
  const payload = await readJson(response);

  saveSession(payload.session);
  return payload;
}

export async function refreshAuthSession(
  refreshToken = getSessionRefreshToken()
) {
  if (!refreshToken) {
    clearSession();
    throw new Error('Session expired. Sign in again.');
  }

  const response = await fetch('/api/auth/session/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const payload = await readJson(response);

  saveSession(payload.session);
  return payload.session;
}

export async function ensureAuthSession() {
  const session = getSavedSession();

  if (!session) {
    return null;
  }

  if (!isSessionExpiringSoon(session)) {
    return session;
  }

  try {
    return await refreshAuthSession(session.refreshToken);
  } catch (error) {
    clearSession();
    throw error;
  }
}
