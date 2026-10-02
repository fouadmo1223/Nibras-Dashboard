const DEFAULT_API_URL = 'http://localhost:5000/api/v1';
export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

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

function buildUrl(path, query) {
  const url = new URL(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Single entry point for calls to the NestJS API. Unwraps the standard
 * `{ success, data, meta }` envelope and normalises failures into ApiError.
 */
export async function apiRequest(path, { method = 'GET', body, query, headers, signal } = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw new ApiError(0, { error: { code: 'NETWORK_ERROR', message: 'Unable to reach the server.' } }, { cause });
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) throw new ApiError(response.status, payload);
  return payload ? { data: payload.data, meta: payload.meta } : { data: null, meta: undefined };
}
