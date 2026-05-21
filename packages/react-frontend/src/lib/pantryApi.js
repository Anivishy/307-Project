import { apiFetch } from './api.js';

async function readJson(response) {
  if (response.status === 204) {
    return null;
  }

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

export async function getIngredientCatalog() {
  const response = await fetch('/api/ingredients/catalog');
  return readJson(response);
}

export function getPantryItems() {
  return apiFetch('/api/ingredients');
}

export function createPantryItem(item) {
  return apiFetch('/api/ingredients', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export function updatePantryItem(itemId, item) {
  return apiFetch(`/api/ingredients/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(item)
  });
}

export function deletePantryItem(itemId) {
  return apiFetch(`/api/ingredients/${itemId}`, {
    method: 'DELETE'
  });
}
