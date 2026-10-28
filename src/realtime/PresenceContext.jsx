import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useInbox } from '../chat/InboxContext.jsx';
import { useRealtime } from './RealtimeContext.jsx';
import { useSocketEvent } from './useSocketEvent.js';

const PresenceContext = createContext({ presence: {} });

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export function PresenceProvider({ children }) {
  const { conversations } = useInbox();
  const { request, connected, sessionEpoch } = useRealtime();
  const [presence, setPresence] = useState({});
  const subscribedRef = useRef(new Set());
  const epochRef = useRef(sessionEpoch);

  // DM ke other users ki presence subscribe hoti hai
  const idsKey = useMemo(() => {
    const ids = conversations
      .filter((c) => c.type === 'dm' && c.otherUser?.id)
      .map((c) => c.otherUser.id);
    return [...new Set(ids)].sort().join(',');
  }, [conversations]);

  useSocketEvent('presence:update', (p) => {
    if (!p?.userId) return;
    setPresence((prev) => ({
      ...prev,
      [p.userId]: {
        status: p.status,
        lastSeenAt: p.lastSeenAt ?? prev[p.userId]?.lastSeenAt ?? null,
      },
    }));
  });

  useEffect(() => {
    if (!connected) return;

    // Naya socket session = server-side subscriptions reset
    if (epochRef.current !== sessionEpoch) {
      epochRef.current = sessionEpoch;
      subscribedRef.current = new Set();
    }

    const current = subscribedRef.current;
    const desired = new Set(idsKey ? idsKey.split(',') : []);
    const toAdd = [...desired].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !desired.has(id));

    chunk(toAdd, 100).forEach((ids) => {
      ids.forEach((id) => current.add(id));
      request('presence:subscribe', { userIds: ids })
        .then((data) => {
          const list = data?.presences ?? data?.presence ?? data?.statuses;
          if (!Array.isArray(list)) return;
          setPresence((prev) => {
            const next = { ...prev };
            list.forEach((p) => {
              if (p?.userId) next[p.userId] = { status: p.status, lastSeenAt: p.lastSeenAt ?? null };
            });
            return next;
          });
        })
        .catch(() => {
          ids.forEach((id) => current.delete(id));
        });
    });

    chunk(toRemove, 100).forEach((ids) => {
      ids.forEach((id) => current.delete(id));
      request('presence:unsubscribe', { userIds: ids }).catch(() => {});
    });
  }, [idsKey, connected, sessionEpoch, request]);

  const value = useMemo(() => ({ presence }), [presence]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(userId) {
  const { presence } = useContext(PresenceContext);
  return userId ? presence[userId] ?? null : null;
}
