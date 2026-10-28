import { useEffect, useRef } from 'react';
import { useRealtime } from './RealtimeContext.jsx';

export function useSocketEvent(event, handler) {
  const { socket } = useRealtime();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const fn = (...args) => handlerRef.current(...args);
    socket.on(event, fn);
    return () => {
      socket.off(event, fn);
    };
  }, [socket, event]);
}
