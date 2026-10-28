import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useInbox } from '../chat/InboxContext.jsx';
import { ReceiptsContext } from '../chat/ReceiptsContext.js';
import { useMessages } from '../chat/useMessages.js';
import { useReceipts } from '../chat/useReceipts.js';
import { useTypingEmitter, useTypingUsers } from '../chat/useTyping.js';
import { usePresence } from '../realtime/PresenceContext.jsx';
import { conversationTitle, formatListTime } from '../utils/format.js';
import MessageComposer from './MessageComposer.jsx';
import MessageList from './MessageList.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import { linkCls } from './ui.js';

function subtitleOf(conversation, presence) {
  if (!conversation) return '';
  if (conversation.type === 'dm') {
    if (presence?.status === 'online') return 'Online';
    if (presence?.lastSeenAt) return `Last seen ${formatListTime(presence.lastSeenAt)}`;
    return '';
  }
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
  const isDm = conversation?.type === 'dm';
  const showNames = conversation?.type === 'group' || conversation?.type === 'channel';
  const notFound = chat.error?.code === 'CONVERSATION_NOT_FOUND';

  const typingIds = useTypingUsers(conversationId, user?.id);
  const typing = useTypingEmitter(conversationId);
  const receiptFor = useReceipts(conversationId, user?.id, isDm);
  const presence = usePresence(isDm ? conversation.otherUser?.id : null);
  const subtitle = subtitleOf(conversation, presence);

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
        <ReceiptsContext.Provider value={receiptFor}>
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
          <TypingIndicator userIds={typingIds} />
          <MessageComposer
            onSend={chat.send}
            onTyping={typing.notifyTyping}
            onStopTyping={typing.stopTyping}
          />
        </ReceiptsContext.Provider>
      )}
    </div>
  );
}
