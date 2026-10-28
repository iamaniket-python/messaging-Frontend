import { api } from './client.js';

function normalizePrefs(data) {
  const p = data?.preferences ?? data;
  if (!p || typeof p !== 'object') return null;
  return { messagesMode: p.messagesMode, mentionsEnabled: p.mentionsEnabled };
}

export async function listNotifications({ limit = 20, cursor, unread } = {}) {
  const data = await api.get('/notifications', {
    query: { limit, cursor, unread: unread ? 'true' : undefined },
  });
  return {
    notifications: data?.notifications ?? [],
    pageInfo: data?.pageInfo ?? { hasMore: false, nextCursor: null },
  };
}

export async function getUnreadCount() {
  const data = await api.get('/notifications/unread-count');
  return Number(data?.unreadCount ?? 0);
}

// payload: { ids: [...] } ya { all: true }
export function markNotificationsRead(payload) {
  return api.post('/notifications/read', payload);
}

export async function getNotificationPreferences() {
  const data = await api.get('/users/me/notification-preferences');
  return normalizePrefs(data);
}

export async function updateNotificationPreferences(patch) {
  const data = await api.patch('/users/me/notification-preferences', patch);
  return normalizePrefs(data);
}
