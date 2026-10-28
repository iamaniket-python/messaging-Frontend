import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtime } from '../realtime/RealtimeContext.jsx';
import { useSocketEvent } from '../realtime/useSocketEvent.js';

const START_THROTTLE_MS = 2000;
const IDLE_STOP_MS = 3000;
const REMOTE_EXPIRY_MS = 6000;

// Mera typing: start max har ~2s, stop on idle 3s / blur / send
export function useTypingEmitter(conversationId) {
  const { request } = useRealtime();
  const lastStartRef = useRef(0);
  const idleRef = useRef(null);
  const activeRef = useRef(false);

  const emit = useCallback(
    (event) => {
      request(event, { conversationId }).catch(() => {});
    },
    [request, conversationId],
  );

  const stopTyping = useCallback(() => {
    clearTimeout(idleRef.current);
    idleRef.current = null;
    if (activeRef.current) {
      activeRef.current = false;
      lastStartRef.current = 0;
      emit('typing:stop');
    }
  }, [emit]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (!activeRef.current || now - lastStartRef.current >= START_THROTTLE_MS) {
      activeRef.current = true;
      lastStartRef.current = now;
      emit('typing:start');
    }
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(stopTyping, IDLE_STOP_MS);
  }, [emit, stopTyping]);

  useEffect(() => stopTyping, [stopTyping]);

  return { notifyTyping, stopTyping };
}

// Dusron ka typing: userIds list
export function useTypingUsers(conversationId, meId) {
  const [userIds, setUserIds] = useState([]);
  const timersRef = useRef(new Map());

  const clearUser = useCallback((id) => {
    const t = timersRef.current.get(id);
    if (t) clearTimeout(t);
    timersRef.current.delete(id);
    setUserIds((prev) => prev.filter((x) => x !== id));
  }, []);

  useSocketEvent('typing:update', (p) => {
    if (!p || p.conversationId !== conversationId || p.userId === meId) return;
    if (!p.isTyping) {
      clearUser(p.userId);
      return;
    }
    const existing = timersRef.current.get(p.userId);
    if (existing) clearTimeout(existing);
    timersRef.current.set(
      p.userId,
      setTimeout(() => clearUser(p.userId), REMOTE_EXPIRY_MS),
    );
    setUserIds((prev) => (prev.includes(p.userId) ? prev : [...prev, p.userId]));
  });

  // Message aa gaya to us user ka typing band
  useSocketEvent('message:new', (payload) => {
    const m = payload?.message ?? payload;
    if (m?.conversationId === conversationId && m?.senderId) clearUser(m.senderId);
  });

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return userIds;
}
