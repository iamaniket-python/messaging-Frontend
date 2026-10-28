import { useCallback, useEffect, useState } from 'react';
import { getReceipts } from '../api/conversations.js';
import { compareIds } from '../utils/ids.js';
import { useRealtime } from '../realtime/RealtimeContext.jsx';
import { useSocketEvent } from '../realtime/useSocketEvent.js';

function maxId(a, b) {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return compareIds(a, b) >= 0 ? a : b;
}

// Watermark receipts (sirf DM). Message read by user agar message.id <= last_read id
export function useReceipts(conversationId, meId, enabled) {
  const { sessionEpoch } = useRealtime();
  const [marks, setMarks] = useState({ read: null, delivered: null });

  useEffect(() => {
    if (!enabled || !meId) return undefined;
    let cancelled = false;
    getReceipts(conversationId)
      .then((list) => {
        if (cancelled) return;
        setMarks((prev) =>
          list
            .filter((r) => r.userId !== meId)
            .reduce(
              (acc, r) => ({
                read: maxId(acc.read, r.lastReadId),
                delivered: maxId(acc.delivered, maxId(r.lastDeliveredId, r.lastReadId)),
              }),
              prev,
            ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversationId, meId, enabled, sessionEpoch]);

  useSocketEvent('message:delivered', (p) => {
    if (!enabled || p?.conversationId !== conversationId || p?.userId === meId) return;
    setMarks((m) => ({ ...m, delivered: maxId(m.delivered, p.messageId) }));
  });

  useSocketEvent('message:read', (p) => {
    if (!enabled || p?.conversationId !== conversationId || p?.userId === meId) return;
    setMarks((m) => ({
      read: maxId(m.read, p.messageId),
      delivered: maxId(m.delivered, p.messageId),
    }));
  });

  return useCallback(
    (message) => {
      if (!enabled || message.id == null || message.senderId !== meId || message.deleted) return null;
      if (marks.read != null && compareIds(message.id, marks.read) <= 0) return 'read';
      if (marks.delivered != null && compareIds(message.id, marks.delivered) <= 0) return 'delivered';
      return 'sent';
    },
    [enabled, meId, marks],
  );
}
