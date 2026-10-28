import { api } from './client.js';

export async function listConversations(opts) {
  const data = await api.get('/conversations', opts);
  return data?.conversations ?? [];
}

export function markRead(conversationId, messageId) {
  return api.post(`/conversations/${conversationId}/read`, { messageId });
}
