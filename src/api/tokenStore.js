const REFRESH_KEY = 'refreshToken';

let accessToken = null;
const failureListeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token) {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function setTokens({ accessToken: at, refreshToken: rt }) {
  setAccessToken(at);
  if (rt) setRefreshToken(rt);
}

export function clearTokens() {
  accessToken = null;
  setRefreshToken(null);
}

export function onAuthFailure(callback) {
  failureListeners.add(callback);
  return () => {
    failureListeners.delete(callback);
  };
}

export function emitAuthFailure() {
  failureListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore listener errors */
    }
  });
}
