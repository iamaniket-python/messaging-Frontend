import { api } from './client.js';

export async function searchMessages({
  q,
  conversationId,
  senderId,
  from,
  to,
  limit = 20,
  cursor,
  signal,
}) {
  const data = await api.get('/search/messages', {
    query: { q, conversationId, senderId, from, to, limit, cursor },
    signal,
  });
  return {
    results: data?.results ?? [],
    pageInfo: data?.pageInfo ?? { hasMore: false, nextCursor: null },
  };
}
