import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import * as authApi from '../api/auth.js';
import { refreshSession } from '../api/client.js';
import { getRefreshToken, onAuthFailure } from '../api/tokenStore.js';

const AuthContext = createContext(null);

const initialState = { status: 'loading', user: null };

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { status: 'loading', user: null };
    case 'AUTHENTICATED':
      return { status: 'authenticated', user: action.user };
    case 'GUEST':
      return { status: 'guest', user: null };
    case 'ERROR':
      return { status: 'error', user: null };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [attempt, setAttempt] = useState(0);

  // Bootstrap: refresh token hai to session restore karo
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getRefreshToken()) {
        dispatch({ type: 'GUEST' });
        return;
      }
      try {
        await refreshSession();
        const user = await authApi.fetchMe();
        if (!cancelled) dispatch({ type: 'AUTHENTICATED', user });
      } catch (err) {
        if (cancelled) return;
        if (err?.code === 'NETWORK_ERROR' || err?.status >= 500) {
          dispatch({ type: 'ERROR' });
        } else {
          dispatch({ type: 'GUEST' });
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Refresh fail hone par automatic logout (guards /login par bhej denge)
  useEffect(() => onAuthFailure(() => dispatch({ type: 'GUEST' })), []);

  const login = useCallback(async (credentials) => {
    const user = await authApi.login(credentials);
    dispatch({ type: 'AUTHENTICATED', user });
    return user;
  }, []);

  const register = useCallback(async (payload) => {
    const user = await authApi.register(payload);
    dispatch({ type: 'AUTHENTICATED', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    dispatch({ type: 'GUEST' });
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: 'LOADING' });
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ status: state.status, user: state.user, login, register, logout, retry }),
    [state, login, register, logout, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
