import { tokenStorage } from '@/lib/token-storage';

const DEFAULT_API_URL = 'http://localhost:5000/api/v1';
export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

const AUTH_PATHS_WITHOUT_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

/**
 * 401s worth one refresh attempt: an expired access token, or a missing/invalid one while a
 * refresh token is still in storage (e.g. a fresh tab, before the in-memory access token has
 * been restored).
 */
const shouldRefresh = (error) =>
  error.code === 'TOKEN_EXPIRED' ||
  (Boolean(tokenStorage.getRefreshToken()) && ['UNAUTHORIZED', 'SESSION_EXPIRED'].includes(error.code));

/** Error raised for any non-2xx API response, carrying the API error envelope. */
export class ApiError extends Error {
  constructor(status, body, options) {
    super(body?.error?.message || `Request failed with status ${status}`, options);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error?.code || 'UNKNOWN_ERROR';
    this.details = body?.error?.details;
    this.requestId = body?.meta?.requestId;
  }
}

/** Persists a token-transport auth response (login/refresh). */
export function storeSession(data) {
  tokenStorage.setAccessToken(data.accessToken);
  tokenStorage.setRefreshToken(data.refreshToken);
  return data;
}

const expiredListeners = new Set();
/** Subscribe to "the session is gone" (refresh failed). Returns an unsubscribe function. */
export function onSessionExpired(listener) {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

function buildUrl(path, query) {
  const url = new URL(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function send(path, { method = 'GET', body, query, headers, signal } = {}) {
  const accessToken = tokenStorage.getAccessToken();
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        // The dashboard language, so API messages come back translated.
        'Accept-Language': document.documentElement.lang || 'en',
        // Tokens, never cookies: the dashboard, website and API are three separate origins
        // with no shared parent domain, so SameSite cookie auth can't work here at all.
        'X-Auth-Transport': 'token',
        'X-Client-Type': 'web',
        // FormData (file uploads) sets its own multipart boundary header.
        ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw new ApiError(0, { error: { code: 'NETWORK_ERROR', message: 'Unable to reach the server.' } }, { cause });
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) throw new ApiError(response.status, payload);
  // `message` is the API's user-facing confirmation text; clients show it as-is.
  return payload
    ? { data: payload.data, message: payload.message, meta: payload.meta }
    : { data: null, message: undefined, meta: undefined };
}

// Concurrent 401s share one refresh; REFRESH_RACE (another tab rotated first) retries once.
let refreshInFlight = null;
export function refreshSession() {
  refreshInFlight ??= (async () => {
    const attempt = async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new ApiError(401, { error: { code: 'REFRESH_TOKEN_INVALID', message: 'Not signed in.' } });
      }
      const { data } = await send('/auth/refresh', { method: 'POST', body: { refreshToken } });
      return storeSession(data);
    };
    try {
      return await attempt();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'REFRESH_RACE') return attempt();
      throw error;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Single entry point for calls to the NestJS API. Unwraps the standard
 * `{ success, data, meta }` envelope, normalises failures into ApiError, and
 * transparently refreshes an expired access token once.
 */
export async function apiRequest(path, options = {}) {
  try {
    return await send(path, options);
  } catch (error) {
    const canRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      shouldRefresh(error) &&
      !AUTH_PATHS_WITHOUT_REFRESH.some((p) => path.startsWith(p));
    if (!canRefresh) throw error;

    try {
      await refreshSession();
    } catch (refreshError) {
      tokenStorage.clear();
      expiredListeners.forEach((listener) => listener(refreshError));
      throw refreshError;
    }
    return send(path, options);
  }
}
