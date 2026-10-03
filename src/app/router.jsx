import { createBrowserRouter } from 'react-router';
import NotFoundPage from '@/pages/NotFoundPage';
import RouteErrorPage from '@/pages/RouteErrorPage';

/** Route modules load on demand so the initial bundle stays small as admin modules grow. */
const page = (load) => async () => ({ Component: (await load()).default });

/** Signed-in frame: RequireAuth (dashboard.access) around the sidebar/top-bar shell. */
async function loadShell() {
  const [{ default: RequireAuth }, { default: AppShell }] = await Promise.all([
    import('@/features/auth/RequireAuth'),
    import('@/layouts/AppShell'),
  ]);
  return {
    Component: () => (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
  };
}

// `handle.crumb` is the message key shown in the breadcrumbs.
export const routes = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', lazy: page(() => import('@/pages/LoginPage')) },
      { path: '/forgot-password', lazy: page(() => import('@/pages/ForgotPasswordPage')) },
      {
        path: '/',
        lazy: loadShell,
        children: [
          { index: true, lazy: page(() => import('@/pages/OverviewPage')), handle: { crumb: 'nav.overview' } },
          { path: 'settings', lazy: page(() => import('@/pages/SettingsPage')), handle: { crumb: 'nav.settings' } },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
