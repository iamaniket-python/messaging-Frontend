import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { deleteMessage, editMessage, listMessages, sendMessage } from '../api/messages.js';
import { compareIds, newClientId } from '../utils/ids.js';
import { errorText } from '../utils/format.js';
import { initialMessagesState, messagesReducer } from './messagesReducer.js';
import { useInbox } from './InboxContext.jsx';
import { useRealtime } from '../realtime/RealtimeContext.jsx';
import { useSocketEvent } from '../realtime/useSocketEvent.js';

const PAGE_SIZE = 30;

function newestOf(list) {
  return list.reduce((a, b) => (!a || compareIds(b.id, a.id) > 0 ? b : a), null);
}

function lastConfirmedId(items) {
  const newest = newestOf(items.filter((m) => m.id != null));
  return newest ? newest.id : undefined;
}

export function useMessages(conversationId, user) {
  const [state, dispatch] = useReducer(messagesReducer, initialMessagesState);
  const [reloadTick, setReloadTick] = useState(0);
  const { bumpConversation, markConversationRead } = useInbox();
  const { sessionEpoch, request } = useRealtime();

  const stateRef = useRef(state);
  stateRef.current = state;
  const loadingOlderRef = useRef(false);

  const userId = user?.id;

  // Initial load (latest page)
  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'LOAD_START' });

    listMessages(conversationId, { limit: PAGE_SIZE, signal: controller.signal })
      .then(({ messages, pageInfo }) => {
        dispatch({ type: 'LOAD_SUCCESS', messages, pageInfo });
        const newest = newestOf(messages);
        if (newest) markConversationRead(conversationId, newest.id, true);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        dispatch({ type: 'LOAD_ERROR', error: { code: err?.code, message: errorText(err) } });
      });

    return () => controller.abort();
  }, [conversationId, reloadTick, markConversationRead]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  // Realtime: new / updated / deleted
  useSocketEvent('message:new', (payload) => {
    const message = payload?.message ?? payload;
    if (!message || message.conversationId !== conversationId) return;
    dispatch({ type: 'UPSERT', message });
    if (message.senderId !== userId && document.visibilityState === 'visible') {
      markConversationRead(conversationId, message.id);
    }
  });

  useSocketEvent('message:updated', (payload) => {
    const message = payload?.message ?? payload;
    if (!message || message.conversationId !== conversationId) return;
    dispatch({ type: 'UPSERT', message });
  });

  useSocketEvent('message:deleted', (payload) => {
    if (!payload || payload.conversationId !== conversationId) return;
    dispatch({ type: 'MARK_DELETED', id: payload.messageId });
  });

  // Tab wapas visible ho to read mark karo
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      const s = stateRef.current;
      if (s.status !== 'ready') return;
      const newest = newestOf(s.items.filter((m) => m.id != null));
      if (newest) markConversationRead(conversationId, newest.id, true);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId, markConversationRead]);

  // Reconnect gap sync: ?after=<lastKnownId>
  useEffect(() => {
    if (sessionEpoch <= 1) return undefined;
    let cancelled = false;

    async function sync() {
      if (stateRef.current.status !== 'ready') return;
      let cursor = lastConfirmedId(stateRef.current.items);
      const hadCursor = Boolean(cursor);
      let latestFromOthers = null;

      try {
        for (let i = 0; i < 10; i += 1) {
          const { messages, pageInfo } = await listMessages(conversationId, {
            limit: 50,
            after: cursor,
          });
          if (cancelled || messages.length === 0) break;
          dispatch({ type: 'MERGE', messages });
          const newest = newestOf(messages);
          cursor = newest.id;
          if (messages.some((m) => m.senderId !== userId)) latestFromOthers = newest;
          if (!hadCursor || !pageInfo?.hasMore) break;
        }
      } catch {
        return;
      }

      if (!cancelled && latestFromOthers && document.visibilityState === 'visible') {
        markConversationRead(conversationId, latestFromOthers.id);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, [sessionEpoch, conversationId, userId, markConversationRead]);

  // Infinite scroll upward (before cursor)
  const loadOlder = useCallback(async () => {
    const s = stateRef.current;
    if (loadingOlderRef.current || s.status !== 'ready' || s.loadingMore || !s.hasMore) return;
    const confirmed = s.items.filter((m) => m.id != null);
    const before = s.nextCursor ?? confirmed[0]?.id;
    if (!before) return;

    loadingOlderRef.current = true;
    dispatch({ type: 'LOAD_MORE_START' });
    try {
      const { messages, pageInfo } = await listMessages(conversationId, {
        limit: PAGE_SIZE,
        before,
      });
      dispatch({ type: 'LOAD_MORE_SUCCESS', messages, pageInfo });
    } catch (err) {
      dispatch({ type: 'LOAD_MORE_ERROR', error: errorText(err) });
    } finally {
      loadingOlderRef.current = false;
    }
  }, [conversationId]);

  // Optimistic send. Socket pehle, na chale to REST (same clientMessageId = duplicate safe).
  const send = useCallback(
    async (content, existingClientMessageId) => {
      const clientMessageId = existingClientMessageId ?? newClientId();

      if (existingClientMessageId) {
        dispatch({ type: 'SEND_RETRY', clientMessageId });
      } else {
        dispatch({
          type: 'OPTIMISTIC_ADD',
          message: {
            id: null,
            conversationId,
            senderId: userId,
            clientMessageId,
            type: 'text',
            content,
            deleted: false,
            editedAt: null,
            createdAt: new Date().toISOString(),
            attachments: [],
            status: 'sending',
          },
        });
      }

      try {
        let message;
        try {
          const data = await request('message:send', { conversationId, clientMessageId, content });
          message = data?.message ?? data;
        } catch (err) {
          if (err?.code !== 'NETWORK_ERROR') throw err;
          message = await sendMessage(conversationId, { content, clientMessageId });
        }
        dispatch({ type: 'UPSERT', message });
        bumpConversation(conversationId, message);
      } catch (err) {
        dispatch({ type: 'SEND_FAILED', clientMessageId, error: errorText(err) });
      }
    },
    [conversationId, userId, bumpConversation, request],
  );

  const retrySend = useCallback((message) => send(message.content, message.clientMessageId), [send]);

  const discard = useCallback((message) => {
    dispatch({ type: 'REMOVE_LOCAL', clientMessageId: message.clientMessageId });
  }, []);

  const edit = useCallback(async (messageId, content) => {
    const message = await editMessage(messageId, content);
    dispatch({ type: 'UPSERT', message });
  }, []);

  const remove = useCallback(async (messageId) => {
    await deleteMessage(messageId);
    dispatch({ type: 'MARK_DELETED', id: messageId });
  }, []);

  return {
    items: state.items,
    status: state.status,
    error: state.error,
    hasMore: state.hasMore,
    loadingMore: state.loadingMore,
    loadMoreError: state.loadMoreError,
    reload,
    loadOlder,
    send,
    retrySend,
    discard,
    edit,
    remove,
  };
}
