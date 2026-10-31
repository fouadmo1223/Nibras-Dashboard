/**
 * The refresh token is the long-lived credential, needed so a reload restores the session
 * without signing in again. There's no equivalent of a native OS keychain in the browser, so
 * it lives in `localStorage` — readable by any script on this origin. That's the standard
 * tradeoff once auth moves off cookies, which this did because the website, dashboard and API
 * are deployed as three separate origins with no shared parent domain: a `SameSite=Lax` cookie
 * set by the API is never sent back on the dashboard's cross-site `fetch` calls, so cookie auth
 * cannot work here at all. The short-lived access token stays in memory only.
 */
const REFRESH_KEY = 'nibras.dashboard.refreshToken';

let accessToken = null;

export const tokenStorage = {
  getAccessToken: () => accessToken,
  setAccessToken: (token) => {
    accessToken = token || null;
  },

  getRefreshToken: () => {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken: (token) => {
    try {
      if (token) localStorage.setItem(REFRESH_KEY, token);
      else localStorage.removeItem(REFRESH_KEY);
    } catch {
      // Private browsing / blocked storage: the session just won't survive a reload.
    }
  },

  clear() {
    accessToken = null;
    tokenStorage.setRefreshToken(null);
  },
};
