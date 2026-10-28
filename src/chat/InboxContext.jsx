import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { listConversations, markRead } from '../api/conversations.js';
import { errorText } from '../utils/format.js';

const InboxContext = createContext(null);

const initialState = { items: [], status: 'loading', error: null };

function sortValue(c) {
  return Date.parse(c.lastMessage?.createdAt || c.updatedAt || c.createdAt || '') || 0;
}

function sortConversations(list) {
  return [...list].sort((a, b) => sortValue(b) - sortValue(a));
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: state.items.length ? 'ready' : 'loading', error: null };
    case 'LOADED':
      return { status: 'ready', items: sortConversations(action.items), error: null };
    case 'ERROR':
      return { ...state, status: state.items.length ? 'ready' : 'error', error: action.error };
    case 'BUMP':
      return {
        ...state,
        items: sortConversations(
          state.items.map((c) =>
            c.id === action.conversationId ? { ...c, lastMessage: action.message } : c,
          ),
        ),
      };
    case 'READ':
      return {
        ...state,
        items: state.items.map((c) =>
          c.id === action.conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      };
    default:
      return state;
  }
}

export function InboxProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;

  const refresh = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const items = await listConversations();
      dispatch({ type: 'LOADED', items });
    } catch (err) {
      dispatch({ type: 'ERROR', error: errorText(err) });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const bumpConversation = useCallback((conversationId, message) => {
    dispatch({ type: 'BUMP', conversationId, message });
  }, []);

  const markConversationRead = useCallback((conversationId, messageId) => {
    const conv = itemsRef.current.find((c) => c.id === conversationId);
    if (conv && !conv.unreadCount) return;
    dispatch({ type: 'READ', conversationId });
    markRead(conversationId, messageId).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      conversations: state.items,
      status: state.status,
      error: state.error,
      refresh,
      bumpConversation,
      markConversationRead,
    }),
    [state, refresh, bumpConversation, markConversationRead],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error('useInbox must be used inside <InboxProvider>');
  return ctx;
}
