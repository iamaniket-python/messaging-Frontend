import { Outlet, useMatch } from 'react-router-dom';
import { InboxProvider } from '../chat/InboxContext.jsx';
import { NotificationsProvider } from '../realtime/NotificationsContext.jsx';
import { PresenceProvider } from '../realtime/PresenceContext.jsx';
import { RealtimeProvider } from '../realtime/RealtimeContext.jsx';
import ConnectionBanner from '../components/ConnectionBanner.jsx';
import Sidebar from '../components/Sidebar.jsx';

export default function ChatPage() {
  const chatOpen = Boolean(useMatch('/c/:conversationId'));

  return (
    <RealtimeProvider>
      <InboxProvider>
        <PresenceProvider>
          <NotificationsProvider>
            <div className="flex h-full flex-col">
              <ConnectionBanner />
              <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 md:grid-cols-[320px_1fr]">
                <div className={`min-h-0 ${chatOpen ? 'hidden md:block' : 'block'}`}>
                  <Sidebar />
                </div>
                <main className={`min-h-0 min-w-0 flex-col ${chatOpen ? 'flex' : 'hidden md:flex'}`}>
                  <Outlet />
                </main>
              </div>
            </div>
          </NotificationsProvider>
        </PresenceProvider>
      </InboxProvider>
    </RealtimeProvider>
  );
}
