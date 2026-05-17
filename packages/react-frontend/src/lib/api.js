const DEMO_USER_ID = 'user-admin-1';

export async function readJson(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? payload.error ?? 'Request failed.'
    );
  }

  return payload;
}

export async function apiFetch(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set('x-user-id', DEMO_USER_ID);

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(path, { ...init, headers });
  return readJson(response);
}
