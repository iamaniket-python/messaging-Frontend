import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useInbox } from '../chat/InboxContext.jsx';
import ConversationItem from './ConversationItem.jsx';
import { btn, btnGhost } from './ui.js';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { conversations, status, error, refresh } = useInbox();
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user?.name || user?.email || 'User';

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-border bg-panel">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Messaging</h1>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto">
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
