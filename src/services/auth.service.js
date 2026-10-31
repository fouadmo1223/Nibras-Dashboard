import { apiRequest, storeSession } from './api-client';
import { tokenStorage } from '@/lib/token-storage';

export const authKeys = {
  all: ['auth'],
  session: () => [...authKeys.all, 'session'],
};

/** True only for the session query — everything else is private data dropped on sign-out. */
export const isSessionQuery = (query) => query.queryHash === JSON.stringify(authKeys.session());

const withSession = (result) => {
  storeSession(result.data);
  return result;
};

// Mutations resolve to `{ data, message }` — `message` is the API's confirmation text, shown as-is.
export const login = (body) => apiRequest('/auth/login', { method: 'POST', body }).then(withSession);

export async function logout() {
  const refreshToken = tokenStorage.getRefreshToken();
  try {
    return refreshToken
      ? await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } })
      : { data: null, message: undefined };
  } finally {
    tokenStorage.clear();
  }
}

/** Current session ({ user, session }), or null when signed out. */
export async function getSession() {
  if (!tokenStorage.getRefreshToken()) return null;
  try {
    return (await apiRequest('/auth/session')).data;
  } catch (error) {
    if (error.status === 401) {
      tokenStorage.clear();
      return null;
    }
    throw error;
  }
}

export const forgotPassword = (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });

/** Saves profile fields (name, locale). The saved locale is the language of the user's emails. */
export const updateProfile = (body) => apiRequest('/users/me', { method: 'PATCH', body });
