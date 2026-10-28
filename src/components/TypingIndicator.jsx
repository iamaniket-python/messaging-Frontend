import { useUser } from '../chat/useUser.js';

export default function TypingIndicator({ userIds }) {
  const first = useUser(userIds[0]);

  let text = '';
  if (userIds.length === 1) text = `${first?.name || 'Someone'} is typing...`;
  else if (userIds.length === 2) text = 'Two people are typing...';
  else if (userIds.length > 2) text = 'Several people are typing...';

  return (
    <div className="h-5 px-4 text-xs text-muted" aria-live="polite">
      {text}
    </div>
  );
}
