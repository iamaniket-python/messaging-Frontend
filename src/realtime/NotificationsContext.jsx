import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { useMatch } from 'react-router-dom';
import { getUnreadCount, listNotifications, markNotificationsRead } from '../api/notifications.js';
import { errorText } from '../utils/format.js';
import { useRealtime } from './RealtimeContext.jsx';
import { useSocketEvent } from './useSocketEvent.js';

const NotificationsContext = createContext(null);

const initialState = {
  items: [],
  pageInfo: null,
  unreadCount: 0,
  status: 'idle', // idle | loading | ready | error
  error: null,
  loadingMore: false,
};

function mergeById(existing, incoming) {
  const seen = new Set(existing.map((n) => n.id));
  return [...existing, ...incoming.filter((n) => !seen.has(n.id))];
}

function reducer(state, action) {
  switch (action.type) {
    case 'COUNT':
      return { ...state, unreadCount: action.count };

    case 'LIST_START':
      return { ...state, status: state.items.length ? 'ready' : 'loading', error: null };

    case 'LIST_OK':
      return { ...state, status: 'ready', error: null, items: action.items, pageInfo: action.pageInfo };

    case 'LIST_ERR':
      return { ...state, status: state.items.length ? 'ready' : 'error', error: action.error };

    case 'MORE_START':
      return { ...state, loadingMore: true, error: null };

    case 'MORE_OK':
      return {
        ...state,
        loadingMore: false,
        items: mergeById(state.items, action.items),
        pageInfo: action.pageInfo,
      };

    case 'MORE_ERR':
      return { ...state, loadingMore: false, error: action.error };

    case 'NEW': {
      if (state.items.some((n) => n.id === action.notification.id)) return state;
      return {
        ...state,
        items: [action.notification, ...state.items],
        unreadCount: state.unreadCount + 1,
      };
    }

    case 'READ_IDS': {
      const ids = new Set(action.ids);
      const now = new Date().toISOString();
      let newly = 0;
      const items = state.items.map((n) => {
        if (ids.has(n.id) && !n.readAt) {
          newly += 1;
          return { ...n, readAt: now };
        }
        return n;
      });
      return { ...state, items, unreadCount: Math.max(0, state.unreadCount - newly) };
    }

    case 'READ_ALL': {
      const now = new Date().toISOString();
      return {
        ...state,
        items: state.items.map((n) => (n.readAt ? n : { ...n, readAt: now })),
        unreadCount: 0,
      };
    }

    default:
      return state;
  }
}

export function NotificationsProvider({ children }) {
  const { sessionEpoch } = useRealtime();
  const match = useMatch('/c/:conversationId');
  const openId = match?.params?.conversationId ?? null;

  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const refreshCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      dispatch({ type: 'COUNT', count });
    } catch {
      /* bell silent rahe */
    }
  }, []);

  const loadList = useCallback(async () => {
    dispatch({ type: 'LIST_START' });
    try {
      const { notifications, pageInfo } = await listNotifications({ limit: 20 });
      dispatch({ type: 'LIST_OK', items: notifications, pageInfo });
    } catch (err) {
      dispatch({ type: 'LIST_ERR', error: errorText(err) });
    }
  }, []);

  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    if (s.loadingMore || !s.pageInfo?.hasMore || !s.pageInfo.nextCursor) return;
    dispatch({ type: 'MORE_START' });
    try {
      const { notifications, pageInfo } = await listNotifications({
        limit: 20,
        cursor: s.pageInfo.nextCursor,
      });
      dispatch({ type: 'MORE_OK', items: notifications, pageInfo });
    } catch (err) {
      dispatch({ type: 'MORE_ERR', error: errorText(err) });
    }
  }, []);

  const markRead = useCallback(
    async (ids) => {
      dispatch({ type: 'READ_IDS', ids });
      try {
        await markNotificationsRead({ ids });
      } catch {
        refreshCount();
      }
    },
    [refreshCount],
  );

  const markAllRead = useCallback(async () => {
    dispatch({ type: 'READ_ALL' });
    try {
      await markNotificationsRead({ all: true });
    } catch {
      refreshCount();
      if (stateRef.current.status === 'ready') loadList();
    }
  }, [refreshCount, loadList]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Reconnect ke baad count (aur loaded list) resync
  useEffect(() => {
    if (sessionEpoch <= 1) return;
    refreshCount();
    if (stateRef.current.status === 'ready') loadList();
  }, [sessionEpoch, refreshCount, loadList]);

  useSocketEvent('notification:new', (payload) => {
    const notification = payload?.notification ?? payload;
    if (!notification?.id) return;

    // Jis conversation ko abhi dekh rahe ho uski notification turant read
    const viewing =
      openId &&
      notification.conversationId === openId &&
      document.visibilityState === 'visible';
    if (viewing) {
      markNotificationsRead({ ids: [notification.id] }).catch(() => {});
      return;
    }
    dispatch({ type: 'NEW', notification });
  });

  const value = useMemo(
    () => ({
      items: state.items,
      status: state.status,
      error: state.error,
      pageInfo: state.pageInfo,
      unreadCount: state.unreadCount,
      loadingMore: state.loadingMore,
      loadList,
      loadMore,
      markRead,
      markAllRead,
    }),
    [state, loadList, loadMore, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
