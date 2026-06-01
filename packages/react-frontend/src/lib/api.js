import {
  ensureAuthSession,
  refreshAuthSession
} from '@/lib/authApi.js';
import { readJson } from '@/lib/httpResponse.js';

export { ApiRequestError, readJson } from '@/lib/httpResponse.js';

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
