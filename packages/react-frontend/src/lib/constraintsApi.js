import { apiFetch } from '@/lib/api.js';

export async function fetchConstraints() {
  const payload = await apiFetch('/api/profile/constraints');
  return payload.constraints;
}

export async function fetchSpoonacularDefinitions() {
  const payload = await apiFetch('/api/spoonacular/definitions');
  return payload.definitions;
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
