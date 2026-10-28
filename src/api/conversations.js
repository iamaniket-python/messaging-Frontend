import { api } from './client.js';

export async function listConversations(opts) {
  const data = await api.get('/conversations', opts);
  return data?.conversations ?? [];
}

export function markRead(conversationId, messageId) {
  return api.post(`/conversations/${conversationId}/read`, { messageId });
}

// Shape tolerant: per-user last read / last delivered ids
export async function getReceipts(conversationId) {
  const data = await api.get(`/conversations/${conversationId}/receipts`);
  const list = data?.receipts ?? data?.members ?? (Array.isArray(data) ? data : []);
  return list
    .map((r) => ({
      userId: r.userId ?? r.user?.id,
      lastReadId: r.lastReadMessageId ?? r.lastReadId ?? r.lastRead ?? null,
      lastDeliveredId: r.lastDeliveredMessageId ?? r.lastDeliveredId ?? r.lastDelivered ?? null,
    }))
    .filter((r) => r.userId);
}
