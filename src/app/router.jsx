import { createBrowserRouter } from 'react-router';
import NotFoundPage from '@/pages/NotFoundPage';
import RouteErrorPage from '@/pages/RouteErrorPage';

/** Route modules load on demand so the initial bundle stays small as admin modules grow. */
const page = (load) => async () => ({ Component: (await load()).default });

/** Protected route: page behind RequireAuth (dashboard.access by default). */
const protectedPage = (load, permissions) => async () => {
  const [{ default: RequireAuth }, { default: Page }] = await Promise.all([import('@/features/auth/RequireAuth'), load()]);
  return {
    Component: () => (
      <RequireAuth permissions={permissions}>
        <Page />
      </RequireAuth>
    ),
  };
};

export const routes = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', lazy: page(() => import('@/pages/LoginPage')) },
      { path: '/forgot-password', lazy: page(() => import('@/pages/ForgotPasswordPage')) },
      { path: '/', lazy: protectedPage(() => import('@/pages/FoundationPage')) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
