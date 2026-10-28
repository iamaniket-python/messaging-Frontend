import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ApiError } from '../api/errors.js';
import { refreshSession } from '../api/client.js';
import { getAccessToken } from '../api/tokenStore.js';

const RealtimeContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || undefined;
const AUTH_CODES = new Set(['MISSING_TOKEN', 'INVALID_TOKEN', 'TOKEN_EXPIRED']);
const ACK_TIMEOUT = 15000;
const MAX_AUTH_RETRIES = 3;

function notConnected() {
  return new ApiError({
    status: 0,
    code: 'NETWORK_ERROR',
    message: 'Not connected to realtime server',
  });
}

async function emitOnce(socket, event, payload) {
  let res;
  try {
    res = await socket.timeout(ACK_TIMEOUT).emitWithAck(event, payload);
  } catch {
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Realtime request timed out' });
  }
  if (res && res.ok) return res.data;
  const e = res?.error || {};
  throw new ApiError({
    status: 0,
    code: e.code || 'SOCKET_ERROR',
    message: e.message || 'Realtime request failed',
    details: e.details,
  });
}

// TOKEN_EXPIRED ack aaye to REST se refresh, auth:refresh emit, phir event retry
async function emitWithAuthRetry(socket, event, payload) {
  try {
    return await emitOnce(socket, event, payload);
  } catch (err) {
    if (err.code !== 'TOKEN_EXPIRED') throw err;
    const accessToken = await refreshSession();
    await emitOnce(socket, 'auth:refresh', { accessToken });
    return emitOnce(socket, event, payload);
  }
}

export function RealtimeProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting | ready | disconnected
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const socketRef = useRef(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let authRetries = 0;
    let retryTimer = null;

    const s = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true,
      auth: (cb) => cb({ token: getAccessToken() }),
    });

    s.on('session:ready', () => {
      authRetries = 0;
      readyRef.current = true;
      setStatus('ready');
      setSessionEpoch((n) => n + 1);
    });

    s.on('disconnect', () => {
      readyRef.current = false;
      setStatus('disconnected');
    });

    s.on('connect_error', async (err) => {
      readyRef.current = false;

      // Transport errors: socket.io khud reconnect karta hai
      if (!AUTH_CODES.has(err?.data?.code)) {
        setStatus('disconnected');
        return;
      }

      // Auth errors: middleware reject kare to auto-reconnect nahi hota, manual connect chahiye
      if (authRetries >= MAX_AUTH_RETRIES) {
        setStatus('disconnected');
        return;
      }
      authRetries += 1;
      try {
        await refreshSession();
        if (!cancelled) s.connect();
      } catch (refreshErr) {
        const transient = refreshErr?.code === 'NETWORK_ERROR' || refreshErr?.status >= 500;
        if (transient && !cancelled) {
          authRetries -= 1;
          setStatus('disconnected');
          retryTimer = setTimeout(() => {
            if (!cancelled) s.connect();
          }, 3000);
        }
      }
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      readyRef.current = false;
      s.removeAllListeners();
      s.disconnect();
      if (socketRef.current === s) socketRef.current = null;
    };
  }, []);

  const request = useCallback(async (event, payload) => {
    const s = socketRef.current;
    if (!s || !readyRef.current) throw notConnected();
    return emitWithAuthRetry(s, event, payload);
  }, []);

  const value = useMemo(
    () => ({ socket, status, connected: status === 'ready', sessionEpoch, request }),
    [socket, status, sessionEpoch, request],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside <RealtimeProvider>');
  return ctx;
}
