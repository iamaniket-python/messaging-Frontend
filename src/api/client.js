import { ApiError } from './errors.js';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  emitAuthFailure,
} from './tokenStore.js';

export const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

function buildUrl(path, query) {
  let url = `${API_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

async function rawRequest(method, path, { body, query, auth = true, signal, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const bearer = token ?? getAccessToken();
  if (auth && bearer) headers.Authorization = `Bearer ${bearer}`;

  let res;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Network error' });
  }

  if (res.status === 204) return null;

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || (payload && payload.success === false)) {
    const e = payload?.error || {};
    throw new ApiError({
      status: res.status,
      code: e.code || `HTTP_${res.status}`,
      message: e.message || res.statusText || 'Request failed',
      details: e.details,
      requestId: e.requestId,
    });
  }

  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data;
  return payload;
}

let refreshPromise = null;

// Single-flight: parallel 401s ek hi refresh call share karte hain.
export function refreshSession() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    emitAuthFailure();
    return Promise.reject(
      new ApiError({ status: 401, code: 'NO_REFRESH_TOKEN', message: 'Session expired' }),
    );
  }

  refreshPromise = rawRequest('POST', '/auth/refresh', {
    body: { refreshToken },
    auth: false,
  })
    .then((data) => {
      setTokens(data); // refresh token rotate hota hai: hamesha naya store karo
      return data.accessToken;
    })
    .catch((err) => {
      const transient = err.code === 'NETWORK_ERROR' || err.status >= 500;
      if (!transient) {
        clearTokens();
        emitAuthFailure();
      }
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function request(method, path, opts = {}) {
  const { auth = true } = opts;
  try {
    return await rawRequest(method, path, opts);
  } catch (err) {
    const canRetry = auth && err instanceof ApiError && err.status === 401;
    if (!canRetry) throw err;
    const newToken = await refreshSession();
    return rawRequest(method, path, { ...opts, token: newToken });
  }
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts),
};
