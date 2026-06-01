import { apiFetch } from '@/lib/api.js';
import { readJson } from '@/lib/httpResponse.js';

export async function getIngredientCatalog(query = '', limit = 15) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set('q', query.trim());
  }

  params.set('limit', String(limit));

  const response = await fetch(
    `/api/ingredients/catalog?${params.toString()}`
  );
  return readJson(response);
}

export async function searchIngredientCatalog(query, limit = 15) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit)
  });
  const response = await fetch(
    `/api/ingredients/catalog?${params.toString()}`
  );
  const payload = await readJson(response);
  return payload.ingredients;
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
