const DEMO_ADMIN_USER_ID = "user-admin-1";

async function readJson(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

async function apiFetch(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("x-user-id", DEMO_ADMIN_USER_ID);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });
  return readJson(response);
}

export function getGroupSettings(groupId) {
  return apiFetch(`/api/groups/${groupId}/settings`);
}

export function updateGroupSettings(groupId, updates) {
  return apiFetch(`/api/groups/${groupId}/settings`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function getBundleCandidates(groupId) {
  return apiFetch(`/api/groups/${groupId}/bundle-candidates`);
}
