import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { deleteMessage, editMessage, listMessages, sendMessage } from '../api/messages.js';
import { compareIds, newClientId } from '../utils/ids.js';
import { errorText } from '../utils/format.js';
import { initialMessagesState, messagesReducer } from './messagesReducer.js';
import { useInbox } from './InboxContext.jsx';

const PAGE_SIZE = 30;

export function useMessages(conversationId, user) {
  const [state, dispatch] = useReducer(messagesReducer, initialMessagesState);
  const [reloadTick, setReloadTick] = useState(0);
  const { bumpConversation, markConversationRead } = useInbox();

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
        const newest = messages.reduce(
          (a, b) => (!a || compareIds(b.id, a.id) > 0 ? b : a),
          null,
        );
        if (newest && newest.senderId !== userId) {
          markConversationRead(conversationId, newest.id);
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        dispatch({ type: 'LOAD_ERROR', error: { code: err?.code, message: errorText(err) } });
      });

    return () => controller.abort();
  }, [conversationId, reloadTick, userId, markConversationRead]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

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

  // Optimistic send. Retry me SAME clientMessageId reuse hota hai.
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
        const message = await sendMessage(conversationId, { content, clientMessageId });
        dispatch({ type: 'UPSERT', message });
        bumpConversation(conversationId, message);
      } catch (err) {
        dispatch({ type: 'SEND_FAILED', clientMessageId, error: errorText(err) });
      }
    },
    [conversationId, userId, bumpConversation],
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
