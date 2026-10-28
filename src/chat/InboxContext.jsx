import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { useMatch } from 'react-router-dom';
import { listConversations, markRead } from '../api/conversations.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useRealtime } from '../realtime/RealtimeContext.jsx';
import { useSocketEvent } from '../realtime/useSocketEvent.js';
import { compareIds } from '../utils/ids.js';
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

    case 'MESSAGE': {
      const { conversationId, message, unread } = action;
      return {
        ...state,
        items: sortConversations(
          state.items.map((c) => {
            if (c.id !== conversationId) return c;
            const last = c.lastMessage;
            // Duplicate / purana event: ignore (at-least-once delivery)
            if (last && last.id != null && message.id != null && compareIds(message.id, last.id) <= 0) {
              return c;
            }
            return {
              ...c,
              lastMessage: message,
              unreadCount: (c.unreadCount || 0) + (unread ? 1 : 0),
            };
          }),
        ),
      };
    }

    case 'LAST_UPDATED':
      return {
        ...state,
        items: state.items.map((c) =>
          c.id === action.message.conversationId && c.lastMessage?.id === action.message.id
            ? { ...c, lastMessage: action.message }
            : c,
        ),
      };

    case 'LAST_DELETED':
      return {
        ...state,
        items: state.items.map((c) =>
          c.id === action.conversationId && c.lastMessage?.id === action.messageId
            ? { ...c, lastMessage: { ...c.lastMessage, deleted: true, content: null } }
            : c,
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
  const { user } = useAuth();
  const { request, sessionEpoch } = useRealtime();
  const match = useMatch('/c/:conversationId');
  const openId = match?.params?.conversationId ?? null;
  const meId = user?.id;

  const [state, dispatch] = useReducer(reducer, initialState);
  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;
  const refreshTimerRef = useRef(null);

  const refresh = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const items = await listConversations();
      dispatch({ type: 'LOADED', items });
    } catch (err) {
      dispatch({ type: 'ERROR', error: errorText(err) });
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refresh();
    }, 300);
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);

  // Reconnect ke baad inbox resync (pehla ready = initial load, skip)
  useEffect(() => {
    if (sessionEpoch > 1) refresh();
  }, [sessionEpoch, refresh]);

  const bumpConversation = useCallback((conversationId, message) => {
    dispatch({ type: 'MESSAGE', conversationId, message, unread: false });
  }, []);

  const markConversationRead = useCallback(
    (conversationId, messageId, onlyIfUnread = false) => {
      const conv = itemsRef.current.find((c) => c.id === conversationId);
      if (onlyIfUnread && conv && !conv.unreadCount) return;
      dispatch({ type: 'READ', conversationId });
      if (!messageId) return;
      request('message:read', { conversationId, messageId }).catch(() => {
        markRead(conversationId, messageId).catch(() => {});
      });
    },
    [request],
  );

  useSocketEvent('message:new', (payload) => {
    const message = payload?.message ?? payload;
    if (!message?.conversationId) return;

    const conv = itemsRef.current.find((c) => c.id === message.conversationId);
    if (!conv) {
      scheduleRefresh();
      return;
    }

    const mine = message.senderId === meId;
    const viewing = openId === message.conversationId && document.visibilityState === 'visible';
    dispatch({
      type: 'MESSAGE',
      conversationId: message.conversationId,
      message,
      unread: !mine && !viewing,
    });

    if (!mine) {
      request('message:delivered', {
        conversationId: message.conversationId,
        messageId: message.id,
      }).catch(() => {});
    }
  });

  useSocketEvent('message:updated', (payload) => {
    const message = payload?.message ?? payload;
    if (message?.conversationId) dispatch({ type: 'LAST_UPDATED', message });
  });

  useSocketEvent('message:deleted', (payload) => {
    if (payload?.conversationId) {
      dispatch({
        type: 'LAST_DELETED',
        conversationId: payload.conversationId,
        messageId: payload.messageId,
      });
    }
  });

  // Doosre device se read hua to unread badge hatao
  useSocketEvent('message:read', (payload) => {
    if (payload?.userId === meId && payload?.conversationId) {
      dispatch({ type: 'READ', conversationId: payload.conversationId });
    }
  });

  useSocketEvent('conversation:new', scheduleRefresh);
  useSocketEvent('conversation:updated', scheduleRefresh);
  useSocketEvent('conversation:member_added', scheduleRefresh);
  useSocketEvent('conversation:member_removed', scheduleRefresh);
  useSocketEvent('conversation:member_role_changed', scheduleRefresh);

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
