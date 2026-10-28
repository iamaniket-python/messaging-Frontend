import { api } from './client.js';

export async function listMessages(conversationId, { limit = 30, before, after, signal } = {}) {
  const data = await api.get(`/conversations/${conversationId}/messages`, {
    query: { limit, before, after },
    signal,
  });
  return {
    messages: data?.messages ?? [],
    pageInfo: data?.pageInfo ?? { hasMore: false, nextCursor: null },
  };
}

export async function sendMessage(
  conversationId,
  { content, clientMessageId, mentions, attachmentIds },
) {
  const data = await api.post(`/conversations/${conversationId}/messages`, {
    content,
    clientMessageId,
    mentions,
    attachmentIds,
  });
  return data?.message ?? data;
}

export async function editMessage(messageId, content) {
  const data = await api.patch(`/messages/${messageId}`, { content });
  return data?.message ?? data;
}

export async function deleteMessage(messageId) {
  await api.delete(`/messages/${messageId}`);
}
