import { apiFetch } from './api.js';

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
