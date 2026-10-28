import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { btnGhost } from '../components/ui.js';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { conversationId } = useParams();
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user?.name || user?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[320px_1fr]">
      <aside
        className={`min-h-0 flex-col border-r border-border bg-panel ${
          conversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="border-b border-border p-4">
          <h1 className="text-lg font-semibold">Messaging</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[13px] text-muted">Conversations will appear here (F2).</p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent font-bold text-[#0b0d12]">
              {initial}
            </div>
            <div className="flex min-w-0 flex-col">
              <strong className="truncate">{displayName}</strong>
              {user?.email && <span className="truncate text-[13px] text-muted">{user.email}</span>}
            </div>
          </div>
          <button type="button" className={btnGhost} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? '...' : 'Log out'}
          </button>
        </div>
      </aside>

      <main className={`min-w-0 flex-col ${conversationId ? 'flex' : 'hidden md:flex'}`}>
        <div className="m-auto p-6 text-center">
          {conversationId ? (
            <>
              <h2 className="text-xl font-semibold">Conversation</h2>
              <p className="text-muted">ID: {conversationId}</p>
              <p className="text-[13px] text-muted">Chat window F2 me aayega.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">Select a conversation</h2>
              <p className="text-muted">Pick a chat from the sidebar to start messaging.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
