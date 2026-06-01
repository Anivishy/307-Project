import { apiFetch } from './api.js';

export function getNotifications() {
  return apiFetch('/api/notifications');
}

export function markNotificationsRead() {
  return apiFetch('/api/notifications/read', {
    method: 'PATCH'
  });
}
