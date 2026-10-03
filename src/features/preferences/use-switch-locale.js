import { useQueryClient } from '@tanstack/react-query';
import { authKeys, updateProfile } from '@/services/auth.service';
import { usePreferences } from '@/stores/preferences-store';

/**
 * Changes the dashboard language on this device and saves it to the signed-in
 * account, so the API's emails follow the same language.
 */
export function useSwitchLocale() {
  const queryClient = useQueryClient();
  const setLocale = usePreferences((s) => s.setLocale);

  return (locale) => {
    setLocale(locale);
    const session = queryClient.getQueryData(authKeys.session());
    if (session?.user && session.user.locale !== locale) {
      updateProfile({ locale })
        .then(({ data }) => queryClient.setQueryData(authKeys.session(), (current) => (current ? { ...current, user: data } : current)))
        // Best effort: the dashboard already switched; emails keep the previous language until the next save.
        .catch(() => {});
    }
  };
}
