import { apiFetch } from './api.js';

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
