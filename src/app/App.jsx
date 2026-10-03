import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { ApiError, onSessionExpired } from '@/services/api-client';
import { authKeys, isSessionQuery } from '@/services/auth.service';
import Toaster from '@/components/ui/Toaster';
import I18nProvider, { useI18n } from '@/i18n/I18nProvider';
import { router } from './router';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  });
}

/** Keeps the browser tab title in the dashboard language. */
function DocumentTitle() {
  const { t } = useI18n();
  useEffect(() => {
    document.title = t('meta.title');
  }, [t]);
  return null;
}

export default function App() {
  const [queryClient] = useState(makeQueryClient);

  // A failed refresh means the session is gone: drop cached admin data; RequireAuth then redirects to /login.
  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.removeQueries({ predicate: (q) => !isSessionQuery(q) });
        queryClient.setQueryData(authKeys.session(), null);
      }),
    [queryClient],
  );

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <DocumentTitle />
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </I18nProvider>
  );
}
