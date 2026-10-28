import { Fragment, useCallback, useLayoutEffect, useRef } from 'react';
import MessageItem from './MessageItem.jsx';
import { messageKey } from '../utils/ids.js';
import { dayKey, formatDayLabel } from '../utils/format.js';
import { btn } from './ui.js';

export default function MessageList({
  items,
  status,
  error,
  hasMore,
  loadingMore,
  loadMoreError,
  me,
  isDm,
  onLoadOlder,
  onReload,
  onRetry,
  onDiscard,
  onEdit,
  onDelete,
}) {
  const scrollRef = useRef(null);
  const restoreRef = useRef(null);
  const initialDoneRef = useRef(false);
  const lastKeyRef = useRef(null);
  const nearBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (status === 'ready' && hasMore && !loadingMore && el.scrollTop < 80) {
      restoreRef.current = { top: el.scrollTop, height: el.scrollHeight };
      onLoadOlder();
    }
  }, [status, hasMore, loadingMore, onLoadOlder]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || status !== 'ready') return;

    const restore = restoreRef.current;
    if (restore) {
      if (loadingMore) return;
      restoreRef.current = null;
      el.scrollTop = restore.bottom
        ? el.scrollHeight
        : restore.top + (el.scrollHeight - restore.height);
    } else {
      const last = items[items.length - 1];
      const lastKey = last ? messageKey(last) : null;
      if (!initialDoneRef.current) {
        initialDoneRef.current = true;
        lastKeyRef.current = lastKey;
        el.scrollTop = el.scrollHeight;
      } else if (lastKey && lastKey !== lastKeyRef.current) {
        lastKeyRef.current = lastKey;
        if (last.senderId === me?.id || nearBottomRef.current) {
          el.scrollTop = el.scrollHeight;
        }
      }
    }

    // Agar content viewport se chhota hai to aur purane messages load karo
    if (hasMore && !loadingMore && !loadMoreError && el.scrollHeight <= el.clientHeight + 20) {
      restoreRef.current = { bottom: true };
      onLoadOlder();
    }
  }, [items, status, loadingMore, hasMore, loadMoreError, me?.id, onLoadOlder]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [overflow-anchor:none]"
    >
      {status === 'loading' && (
        <div className="flex h-full items-center justify-center">
          <div
            role="status"
            aria-label="Loading messages"
            className="h-7 w-7 animate-spin rounded-full border-[3px] border-border border-t-accent"
          />
        </div>
      )}

      {status === 'error' && (
        <div className="mx-auto mt-10 max-w-sm rounded-lg border border-danger bg-danger/10 p-4 text-center text-sm text-danger">
          <p>{error?.message || 'Could not load messages.'}</p>
          <button type="button" className={`${btn} mt-3`} onClick={onReload}>
            Retry
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="py-2 text-center text-xs text-muted">
            {hasMore ? (
              loadingMore ? (
                'Loading older messages...'
              ) : loadMoreError ? (
                <button type="button" className="text-danger underline" onClick={onLoadOlder}>
                  {loadMoreError} Tap to retry
                </button>
              ) : null
            ) : items.length > 0 ? (
              'Beginning of conversation'
            ) : null}
          </div>

          {items.length === 0 && (
            <p className="mt-10 text-center text-muted">No messages yet. Say hi!</p>
          )}

          {items.map((m, i) => {
            const prev = items[i - 1];
            const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
            const isOwn = m.senderId === me?.id;
            const showSender =
              !isDm && !isOwn && m.type !== 'system' && (newDay || prev.senderId !== m.senderId);

            return (
              <Fragment key={messageKey(m)}>
                {newDay && (
                  <div className="my-3 text-center text-xs text-muted">
                    {formatDayLabel(m.createdAt)}
                  </div>
                )}
                <MessageItem
                  message={m}
                  isOwn={isOwn}
                  showSender={showSender}
                  onRetry={onRetry}
                  onDiscard={onDiscard}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </Fragment>
            );
          })}
        </>
      )}
    </div>
  );
}
