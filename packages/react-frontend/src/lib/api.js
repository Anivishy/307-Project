import {
  ensureAuthSession,
  refreshAuthSession
} from './authApi.js';

export async function readJson(response) {
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new Error('Received an invalid response from the server.');
      }
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        payload?.error ??
        'Request failed.'
    );
  }

  return payload;
}

export async function apiFetch(path, init = {}) {
  const session = await ensureAuthSession();
  const headers = new Headers(init.headers ?? {});
  const accessToken = session?.accessToken ?? null;

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let response = await fetch(path, { ...init, headers });

  if (response.status === 401 && session?.refreshToken) {
    const refreshedSession = await refreshAuthSession(
      session.refreshToken
    );
    headers.set(
      'authorization',
      `Bearer ${refreshedSession.accessToken}`
    );
    response = await fetch(path, { ...init, headers });
  }

  return readJson(response);
}
