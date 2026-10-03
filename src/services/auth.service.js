import { apiRequest, setCsrfToken } from './api-client';

export const authKeys = {
  all: ['auth'],
  session: () => [...authKeys.all, 'session'],
};

/** True only for the session query — everything else is private data dropped on sign-out. */
export const isSessionQuery = (query) => query.queryHash === JSON.stringify(authKeys.session());

const withCsrf = (result) => {
  setCsrfToken(result.data.csrfToken);
  return result;
};

// Mutations resolve to `{ data, message }` — `message` is the API's confirmation text, shown as-is.
export const login = (body) => apiRequest('/auth/login', { method: 'POST', body }).then(withCsrf);

export async function logout() {
  const result = await apiRequest('/auth/logout', { method: 'POST' });
  setCsrfToken(null);
  return result;
}

/** Current session ({ user, session, csrfToken }), or null when signed out. */
export async function getSession() {
  try {
    return withCsrf(await apiRequest('/auth/session')).data;
  } catch (error) {
    if (error.status === 401) {
      setCsrfToken(null);
      return null;
    }
    throw error;
  }
}

export const forgotPassword = (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
