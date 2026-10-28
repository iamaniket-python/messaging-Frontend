import { api } from './client.js';
import { setTokens, getRefreshToken, clearTokens } from './tokenStore.js';

function normalize(data) {
  const t = data.tokens ?? data;
  return { user: data.user, accessToken: t.accessToken, refreshToken: t.refreshToken };
}

export async function login({ email, password }) {
  const data = await api.post('/auth/login', { email, password }, { auth: false });
  const session = normalize(data);
  setTokens(session);
  return session.user;
}

export async function register({ name, email, password }) {
  const data = await api.post('/auth/register', { name, email, password }, { auth: false });
  const session = normalize(data);
  setTokens(session);
  return session.user;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) await api.post('/auth/logout', { refreshToken }, { auth: false });
  } catch {
    /* best-effort */
  } finally {
    clearTokens();
  }
}

export async function logoutAll() {
  try {
    await api.post('/auth/logout-all');
  } catch {
    /* best-effort */
  } finally {
    clearTokens();
  }
}

export async function fetchMe() {
  const data = await api.get('/users/me');
  return data.user;
}
