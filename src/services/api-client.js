const DEFAULT_API_URL = 'http://localhost:5000/api/v1';
export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_PATHS_WITHOUT_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

/** The API sets a readable `nb_session=1` cookie while a refresh token exists. */
const hasSessionHint = () => typeof document !== 'undefined' && /(?:^|;\s*)nb_session=1/.test(document.cookie);

/**
 * 401s worth one refresh attempt: an expired access token, or a missing/invalid one while
 * the session hint says a refresh token should still exist.
 */
const shouldRefresh = (error) =>
  error.code === 'TOKEN_EXPIRED' || (hasSessionHint() && ['UNAUTHORIZED', 'SESSION_EXPIRED'].includes(error.code));

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

// Session-bound CSRF token from login/refresh/session responses; memory only.
let csrfToken = null;
export const setCsrfToken = (token) => {
  csrfToken = token || null;
};
export const getCsrfToken = () => csrfToken;

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
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        // The dashboard language, so API messages come back translated.
        'Accept-Language': document.documentElement.lang || 'en',
        // FormData (file uploads) sets its own multipart boundary header.
        ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(!SAFE_METHODS.has(method) && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
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
      const { data } = await send('/auth/refresh', { method: 'POST' });
      setCsrfToken(data.csrfToken);
      return data;
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
      setCsrfToken(null);
      expiredListeners.forEach((listener) => listener(refreshError));
      throw refreshError;
    }
    return send(path, options);
  }
}

/** fetch() has no upload-progress event; XMLHttpRequest does, so large uploads (lesson video) use this instead. */
function sendWithProgress(path, formData, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildUrl(path), true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Accept-Language', document.documentElement.lang || 'en');
    if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError(0, { error: { code: 'NETWORK_ERROR', message: 'Unable to reach the server.' } }));
    xhr.onload = () => {
      let payload = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }
      if (xhr.status < 200 || xhr.status >= 300 || payload?.success === false) reject(new ApiError(xhr.status, payload));
      else resolve(payload ? { data: payload.data, message: payload.message, meta: payload.meta } : { data: null, message: undefined, meta: undefined });
    };
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener('abort', () => xhr.abort());
    }
    xhr.send(formData);
  });
}

/** Like `apiRequest`, but for a `FormData` upload that reports progress via `onProgress(percent)`. */
export async function apiUpload(path, formData, { onProgress, signal } = {}) {
  try {
    return await sendWithProgress(path, formData, { onProgress, signal });
  } catch (error) {
    const canRefresh = error instanceof ApiError && error.status === 401 && shouldRefresh(error);
    if (!canRefresh) throw error;

    try {
      await refreshSession();
    } catch (refreshError) {
      setCsrfToken(null);
      expiredListeners.forEach((listener) => listener(refreshError));
      throw refreshError;
    }
    return sendWithProgress(path, formData, { onProgress, signal });
  }
}
