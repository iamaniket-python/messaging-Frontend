import { Outlet, useMatch } from 'react-router-dom';
import { InboxProvider } from '../chat/InboxContext.jsx';
import Sidebar from '../components/Sidebar.jsx';

export default function ChatPage() {
  const chatOpen = Boolean(useMatch('/c/:conversationId'));

  return (
    <InboxProvider>
      <div className="grid h-full grid-cols-1 grid-rows-1 md:grid-cols-[320px_1fr]">
        <div className={`min-h-0 ${chatOpen ? 'hidden md:block' : 'block'}`}>
          <Sidebar />
        </div>
        <main className={`min-h-0 min-w-0 flex-col ${chatOpen ? 'flex' : 'hidden md:flex'}`}>
          <Outlet />
        </main>
      </div>
    </InboxProvider>
  );
}
