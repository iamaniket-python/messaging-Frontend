import { NavLink } from 'react-router-dom';
import { avatarInitial, conversationTitle, formatListTime, messagePreview } from '../utils/format.js';

export default function ConversationItem({ conversation, meId }) {
  const title = conversationTitle(conversation);
  const last = conversation.lastMessage;
  const unread = conversation.unreadCount || 0;

  return (
    <NavLink
      to={`/c/${conversation.id}`}
      className={({ isActive }) =>
        `flex items-center gap-3 border-b border-border/50 px-4 py-3 hover:bg-panel-2 ${
          isActive ? 'bg-panel-2' : ''
        }`
      }
    >
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent font-bold text-[#0b0d12]">
        {avatarInitial(title)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate ${unread ? 'font-semibold' : ''}`}>{title}</span>
          <span className="flex-none text-xs text-muted">
            {last ? formatListTime(last.createdAt) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] text-muted">{messagePreview(last, meId)}</span>
          {unread > 0 && (
            <span className="flex-none rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-[#0b0d12]">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </NavLink>
  );
}
