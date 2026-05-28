import { apiFetch, readJson } from './api.js';

export function getGroupPreview(inviteCode) {
  return fetch(
    `/api/groups/invite/${encodeURIComponent(inviteCode)}`
  ).then(readJson);
}

export function getGroups() {
  return apiFetch('/api/groups');
}

export function createGroup(group) {
  return apiFetch('/api/groups', {
    method: 'POST',
    body: JSON.stringify(group)
  });
}

export function joinGroup(inviteCode) {
  return apiFetch('/api/groups/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode })
  });
}

export function getGroup(groupId) {
  return apiFetch(`/api/groups/${groupId}`);
}

export function getGroupMembers(groupId) {
  return apiFetch(`/api/groups/${groupId}/members`);
}

export function getGroupPantry(groupId, ownerId = '') {
  const params = new URLSearchParams();

  if (ownerId) {
    params.set('ownerId', ownerId);
  }

  const query = params.toString();
  return apiFetch(
    `/api/groups/${groupId}/pantry${query ? `?${query}` : ''}`
  );
}

export function getGroupSettings(groupId) {
  return apiFetch(`/api/groups/${groupId}/settings`);
}

export function updateGroupSettings(groupId, updates) {
  return apiFetch(`/api/groups/${groupId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export function getBundleCandidates(groupId) {
  return apiFetch(`/api/groups/${groupId}/bundle-candidates`);
}

export function selectBundleCandidate(groupId, selection) {
  return apiFetch(
    `/api/groups/${groupId}/bundle-candidates/select`,
    {
      method: 'POST',
      body: JSON.stringify(selection)
    }
  );
}
