import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInbox } from '../chat/InboxContext.jsx';
import { useNotifications } from '../realtime/NotificationsContext.jsx';
import { conversationTitle, formatListTime } from '../utils/format.js';
import NotificationPreferences from './NotificationPreferences.jsx';
import { btn } from './ui.js';

const headBtn = 'text-xs text-muted hover:text-text hover:underline disabled:opacity-50';

export default function NotificationBell() {
  const {
    items,
    status,
    error,
    pageInfo,
    unreadCount,
    loadingMore,
    loadList,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications();
  const { conversations } = useInbox();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('list'); // list | settings
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setView('list');
      loadList();
    }
  }

  function handleClick(n) {
    if (!n.readAt) markRead([n.id]);
    setOpen(false);
    navigate(`/c/${n.conversationId}`);
  }

  function describe(n) {
    const conv = conversations.find((c) => c.id === n.conversationId);
    const title = conv ? conversationTitle(conv) : 'a conversation';
    return n.type === 'mention' ? `You were mentioned in ${title}` : `New message in ${title}`;
  }

  return (
    <div ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className="relative rounded-lg border border-border p-2 text-muted transition hover:border-accent hover:text-text"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-accent px-1 text-center text-[11px] font-bold leading-[18px] text-[#0b0d12]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute inset-x-2 top-full z-50 mt-1 flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              {view === 'settings' ? 'Notification settings' : 'Notifications'}
            </h2>
            <div className="flex gap-3">
              {view === 'list' && (
                <button
                  type="button"
                  className={headBtn}
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                className={headBtn}
                onClick={() => setView(view === 'list' ? 'settings' : 'list')}
              >
                {view === 'list' ? 'Settings' : 'Back'}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {view === 'settings' ? (
              <NotificationPreferences />
            ) : (
              <>
                {status === 'loading' && (
                  <div className="space-y-3 p-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-10 animate-pulse rounded-lg bg-panel-2" />
                    ))}
                  </div>
                )}

                {status === 'error' && (
                  <div className="m-4 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
                    <p>{error}</p>
                    <button type="button" className={`${btn} mt-2`} onClick={loadList}>
                      Retry
                    </button>
                  </div>
                )}

                {status === 'ready' && items.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted">You are all caught up.</p>
                )}

                {items.length > 0 && (
                  <ul>
                    {items.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleClick(n)}
                          className={`flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left hover:bg-panel-2 ${
                            n.readAt ? '' : 'bg-accent/5'
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 flex-none rounded-full ${
                              n.readAt ? 'bg-transparent' : 'bg-accent'
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block break-words text-sm ${
                                n.readAt ? 'text-muted' : 'font-semibold'
                              }`}
                            >
                              {n.type === 'mention' && <span className="mr-1 text-accent">@</span>}
                              {describe(n)}
                            </span>
                            <span className="block text-xs text-muted">
                              {formatListTime(n.createdAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {error && items.length > 0 && <p className="px-4 py-2 text-sm text-danger">{error}</p>}

                {pageInfo?.hasMore && (
                  <div className="p-3">
                    <button
                      type="button"
                      className={`${btn} w-full`}
                      onClick={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
