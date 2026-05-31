import { apiFetch, readJson } from './api.js';
import { fetchWithTimeout } from './request.js';

export async function getIngredientCatalog() {
  const response = await fetchWithTimeout('/api/ingredients/catalog');
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
