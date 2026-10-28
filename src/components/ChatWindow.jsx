import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useInbox } from '../chat/InboxContext.jsx';
import { useMessages } from '../chat/useMessages.js';
import { conversationTitle } from '../utils/format.js';
import MessageComposer from './MessageComposer.jsx';
import MessageList from './MessageList.jsx';
import { linkCls } from './ui.js';

function subtitleOf(conversation) {
  if (!conversation) return '';
  if (conversation.type === 'group') return 'Group';
  if (conversation.type === 'channel') {
    return conversation.visibility === 'private' ? 'Private channel' : 'Public channel';
  }
  return '';
}

export default function ChatWindow({ conversationId }) {
  const { user } = useAuth();
  const { conversations } = useInbox();
  const chat = useMessages(conversationId, user);

  const conversation = conversations.find((c) => c.id === conversationId) ?? null;
  const showNames = conversation?.type === 'group' || conversation?.type === 'channel';
  const notFound = chat.error?.code === 'CONVERSATION_NOT_FOUND';
  const subtitle = subtitleOf(conversation);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link
          to="/"
          aria-label="Back to conversations"
          className="text-xl text-muted hover:text-text md:hidden"
        >
          &larr;
        </Link>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{conversationTitle(conversation)}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </header>

      {notFound ? (
        <div className="m-auto p-6 text-center">
          <h2 className="text-xl font-semibold">Conversation not found</h2>
          <p className="mb-3 text-muted">It may have been removed or you are not a member.</p>
          <Link to="/" className={linkCls}>
            Back to inbox
          </Link>
        </div>
      ) : (
        <>
          <MessageList
            items={chat.items}
            status={chat.status}
            error={chat.error}
            hasMore={chat.hasMore}
            loadingMore={chat.loadingMore}
            loadMoreError={chat.loadMoreError}
            me={user}
            isDm={!showNames}
            onLoadOlder={chat.loadOlder}
            onReload={chat.reload}
            onRetry={chat.retrySend}
            onDiscard={chat.discard}
            onEdit={chat.edit}
            onDelete={chat.remove}
          />
          <MessageComposer onSend={chat.send} />
        </>
      )}
    </div>
  );
}
