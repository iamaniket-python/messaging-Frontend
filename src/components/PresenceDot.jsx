import { usePresence } from '../realtime/PresenceContext.jsx';

export default function PresenceDot({ userId, className = '' }) {
  const p = usePresence(userId);
  if (p?.status !== 'online') return null;
  return (
    <span
      role="img"
      aria-label="Online"
      className={`h-3 w-3 rounded-full border-2 border-panel bg-green-500 ${className}`}
    />
  );
}
