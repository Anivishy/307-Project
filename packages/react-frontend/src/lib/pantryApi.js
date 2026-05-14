import { getSessionProfileId } from "./session.js";

async function readJson(response) {
  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

async function apiFetch(path, init = {}) {
  const profileId = getSessionProfileId();

  if (!profileId) {
    throw new Error("Sign in first so pantry changes can save to Supabase.");
  }

  const headers = new Headers(init.headers ?? {});
  headers.set("x-user-id", profileId);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });
  return readJson(response);
}

export async function getIngredientCatalog() {
  const response = await fetch("/api/ingredients/catalog");
  return readJson(response);
}

export function getPantryItems() {
  return apiFetch("/api/ingredients");
}

export function createPantryItem(item) {
  return apiFetch("/api/ingredients", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export function updatePantryItem(itemId, item) {
  return apiFetch(`/api/ingredients/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(item),
  });
}

export function deletePantryItem(itemId) {
  return apiFetch(`/api/ingredients/${itemId}`, {
    method: "DELETE",
  });
}
