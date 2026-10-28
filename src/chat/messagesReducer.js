import { compareIds } from '../utils/ids.js';

export const initialMessagesState = {
  items: [],
  hasMore: false,
  nextCursor: null,
  status: 'loading',
  error: null,
  loadingMore: false,
  loadMoreError: null,
};

// Confirmed messages id (BigInt) se sorted, pending (id null) hamesha end me.
function sortItems(items) {
  const confirmed = items.filter((m) => m.id != null);
  const pending = items.filter((m) => m.id == null);
  confirmed.sort((a, b) => compareIds(a.id, b.id));
  return [...confirmed, ...pending];
}

// Dedupe: id se ya clientMessageId se (optimistic ko server wale se replace karta hai)
function upsertOne(items, incoming) {
  const idx = items.findIndex(
    (m) =>
      (incoming.id != null && m.id === incoming.id) ||
      (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId),
  );
  const next = { ...incoming, status: 'sent' };
  if (idx === -1) return sortItems([...items, next]);
  const copy = items.slice();
  copy[idx] = next;
  return sortItems(copy);
}

function upsertMany(items, list) {
  return list.reduce((acc, m) => upsertOne(acc, m), items);
}

export function messagesReducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...initialMessagesState };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        status: 'ready',
        error: null,
        items: upsertMany(state.items, action.messages),
        hasMore: Boolean(action.pageInfo?.hasMore),
        nextCursor: action.pageInfo?.nextCursor ?? null,
      };

    case 'LOAD_ERROR':
      return { ...state, status: 'error', error: action.error };

    case 'LOAD_MORE_START':
      return { ...state, loadingMore: true, loadMoreError: null };

    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        loadingMore: false,
        items: upsertMany(state.items, action.messages),
        hasMore: Boolean(action.pageInfo?.hasMore),
        nextCursor: action.pageInfo?.nextCursor ?? null,
      };

    case 'LOAD_MORE_ERROR':
      return { ...state, loadingMore: false, loadMoreError: action.error };

    case 'OPTIMISTIC_ADD':
      return { ...state, items: sortItems([...state.items, action.message]) };

    case 'UPSERT':
      return { ...state, items: upsertOne(state.items, action.message) };

    case 'SEND_FAILED':
      return {
        ...state,
        items: state.items.map((m) =>
          m.id == null && m.clientMessageId === action.clientMessageId
            ? { ...m, status: 'failed', sendError: action.error }
            : m,
        ),
      };

    case 'SEND_RETRY':
      return {
        ...state,
        items: state.items.map((m) =>
          m.id == null && m.clientMessageId === action.clientMessageId
            ? { ...m, status: 'sending', sendError: null }
            : m,
        ),
      };

    case 'REMOVE_LOCAL':
      return {
        ...state,
        items: state.items.filter(
          (m) => !(m.id == null && m.clientMessageId === action.clientMessageId),
        ),
      };

    case 'MARK_DELETED':
      return {
        ...state,
        items: state.items.map((m) =>
          m.id === action.id ? { ...m, deleted: true, content: null } : m,
        ),
      };

    default:
      return state;
  }
}
