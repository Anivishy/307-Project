const DEMO_USER_ID = 'user-admin-1';

async function readJson(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        payload.error ??
        'Request failed.'
    );
  }

  return payload;
}

async function apiFetch(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set('x-user-id', DEMO_USER_ID);

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(path, { ...init, headers });
  return readJson(response);
}

export async function fetchConstraints() {
  const payload = await apiFetch('/api/profile/constraints');
  return payload.constraints;
}

export async function saveConstraints(input) {
  const payload = await apiFetch('/api/profile/constraints', {
    method: 'PATCH',
    body: JSON.stringify(input)
  });

  return payload.constraints;
}

export async function searchConstraintIngredients(query) {
  const params = new URLSearchParams({ q: query, limit: '15' });
  const payload = await apiFetch(
    `/api/ingredients/catalog?${params.toString()}`
  );
  return payload.ingredients;
}

export async function fetchConstraintIngredientsByIds(ids) {
  if (ids.length === 0) {
    return [];
  }

  const params = new URLSearchParams({ ids: ids.join(',') });
  const payload = await apiFetch(
    `/api/ingredients/catalog?${params.toString()}`
  );
  return payload.ingredients;
}
