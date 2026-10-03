import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { accents } from '@/constants/accents';
import { browserLocale, dirOf, isLocale } from '@/i18n/config';

/**
 * Per-device dashboard preferences, persisted in localStorage. `applyPreferences`
 * reflects them on <html> (data-theme / data-primary / data-secondary drive the
 * generated token CSS; lang/dir drive language and mirroring). index.html applies
 * the same keys before React loads, so there is no flash.
 */
export const PREFERENCES_KEY = 'nibras.dashboard.preferences';
export const THEMES = ['light', 'dark', 'system'];
export const SIDEBAR_MODES = ['expanded', 'compact'];
export const PRIMARY_ACCENTS = accents.primary.map((a) => a.id);
export const SECONDARY_ACCENTS = accents.secondary.map((a) => a.id);

export const DEFAULT_PREFERENCES = {
  theme: 'system',
  primary: PRIMARY_ACCENTS[0],
  secondary: SECONDARY_ACCENTS[0],
  sidebar: 'expanded',
};

/** Ignores unknown values (old or hand-edited storage) in favour of defaults. */
function sanitize(state) {
  return {
    theme: THEMES.includes(state.theme) ? state.theme : DEFAULT_PREFERENCES.theme,
    primary: PRIMARY_ACCENTS.includes(state.primary) ? state.primary : DEFAULT_PREFERENCES.primary,
    secondary: SECONDARY_ACCENTS.includes(state.secondary) ? state.secondary : DEFAULT_PREFERENCES.secondary,
    sidebar: SIDEBAR_MODES.includes(state.sidebar) ? state.sidebar : DEFAULT_PREFERENCES.sidebar,
    locale: isLocale(state.locale) ? state.locale : browserLocale(),
  };
}

export function applyPreferences({ theme, primary, secondary, locale }) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.setAttribute('data-primary', primary);
  root.setAttribute('data-secondary', secondary);
  root.lang = locale;
  root.dir = dirOf(locale);
}

export const usePreferences = create(
  persist(
    (set) => ({
      ...sanitize({}),
      setTheme: (theme) => set({ theme }),
      setPrimary: (primary) => set({ primary }),
      setSecondary: (secondary) => set({ secondary }),
      setSidebar: (sidebar) => set({ sidebar }),
      toggleSidebar: () => set((s) => ({ sidebar: s.sidebar === 'expanded' ? 'compact' : 'expanded' })),
      setLocale: (locale) => set({ locale }),
      resetAppearance: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: PREFERENCES_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, primary, secondary, sidebar, locale }) => ({ theme, primary, secondary, sidebar, locale }),
      merge: (persisted, current) => ({ ...current, ...sanitize({ ...current, ...(persisted ?? {}) }) }),
    },
  ),
);

applyPreferences(usePreferences.getState());
usePreferences.subscribe(applyPreferences);

// Another tab changed the preferences: follow it.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === PREFERENCES_KEY) usePreferences.persist.rehydrate();
  });
}
