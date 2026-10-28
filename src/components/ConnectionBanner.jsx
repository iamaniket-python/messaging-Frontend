import { useRealtime } from '../realtime/RealtimeContext.jsx';

export default function ConnectionBanner() {
  const { status } = useRealtime();
  if (status !== 'disconnected') return null;
  return (
    <div role="status" className="bg-danger/15 px-4 py-1.5 text-center text-sm text-danger">
      Reconnecting... messages will sync when you are back online.
    </div>
  );
}
