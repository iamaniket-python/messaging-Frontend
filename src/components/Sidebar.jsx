import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useInbox } from '../chat/InboxContext.jsx';
import ConversationItem from './ConversationItem.jsx';
import NotificationBell from './NotificationBell.jsx';
import SearchResults from './SearchResults.jsx';
import { btn, btnGhost, inputCls } from './ui.js';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { conversations, status, error, refresh } = useInbox();
  const [loggingOut, setLoggingOut] = useState(false);
  const [query, setQuery] = useState('');

  const displayName = user?.name || user?.email || 'User';
  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-border bg-panel">
      <div className="relative border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Messaging</h1>
          <NotificationBell />
        </div>

        <div className="relative mt-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('');
            }}
            placeholder="Search messages"
            aria-label="Search messages"
            className={`${inputCls} w-full pr-8`}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-lg leading-none text-muted hover:text-text"
            >
              &times;
            </button>
          )}
        </div>
        {trimmed.length === 1 && (
          <p className="mt-1 text-xs text-muted">Type at least 2 characters.</p>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto">
        {searching ? (
          <SearchResults query={trimmed} conversations={conversations} />
        ) : (
          <>
            {status === 'loading' && (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-panel-2" />
                ))}
              </div>
            )}

            {error && (
              <div className="m-4 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
                <p>{error}</p>
                <button type="button" className={`${btn} mt-2`} onClick={refresh}>
                  Retry
                </button>
              </div>
            )}

            {status === 'ready' && !error && conversations.length === 0 && (
              <p className="p-4 text-sm text-muted">No conversations yet.</p>
            )}

            {conversations.map((c) => (
              <ConversationItem key={c.id} conversation={c} meId={user?.id} />
            ))}
          </>
        )}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <strong className="truncate">{displayName}</strong>
          {user?.email && <span className="truncate text-[13px] text-muted">{user.email}</span>}
        </div>
        <button type="button" className={btnGhost} onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? '...' : 'Log out'}
        </button>
      </div>
    </aside>
  );
}
