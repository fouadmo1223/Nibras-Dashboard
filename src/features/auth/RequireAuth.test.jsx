import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import RequireAuth from './RequireAuth';
import LoginPage from '@/pages/LoginPage';
import { useCurrentUser } from './current-user';
import { useLogout } from './use-auth';

/** Mimics a protected page: reads the user from context and can sign out. */
function ProtectedProbe() {
  const user = useCurrentUser();
  const logout = useLogout();
  return (
    <>
      <h1>Overview</h1>
      <p>{user.name}</p>
      <button type="button" onClick={() => logout.mutate()}>Sign out</button>
    </>
  );
}

const json = (status, body) => ({ ok: status < 300, status, json: () => Promise.resolve(body) });

/** Routes fetch by URL path so tests can describe the API's behaviour declaratively. */
function stubApi(handlers) {
  const fetchMock = vi.fn((url, init) => {
    const path = new URL(url).pathname.replace('/api/v1', '');
    const handler = handlers[`${init?.method ?? 'GET'} ${path}`];
    return Promise.resolve(handler ? handler(init) : json(404, { success: false, error: { code: 'NOT_FOUND' } }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderAt(path) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <RequireAuth><ProtectedProbe /></RequireAuth> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const session = (permissions, roles = ['ADMIN']) =>
  json(200, { success: true, data: { user: { name: 'Ada', email: 'ada@nibras.test', roles, permissions }, csrfToken: 'c' } });
const unauthorized = () => json(401, { success: false, error: { code: 'UNAUTHORIZED' } });

afterEach(() => vi.unstubAllGlobals());

describe('RequireAuth', () => {
  it('redirects signed-out visitors to /login, remembering where they were going', async () => {
    stubApi({ 'GET /auth/session': unauthorized });
    const router = renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2F');
  });

  it('shows a no-access screen to users without dashboard.access (e.g. students)', async () => {
    stubApi({ 'GET /auth/session': () => session([], ['STUDENT']) });
    renderAt('/');
    expect(await screen.findByText('No access to the admin dashboard')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Overview' })).not.toBeInTheDocument();
  });

  it('renders protected content for staff with dashboard.access', async () => {
    stubApi({ 'GET /auth/session': () => session(['dashboard.access']) });
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('signs in and returns to the protected page', async () => {
    let signedIn = false;
    const fetchMock = stubApi({
      'GET /auth/session': () => (signedIn ? session(['dashboard.access']) : unauthorized()),
      'POST /auth/login': () => {
        signedIn = true;
        return session(['dashboard.access']);
      },
    });
    renderAt('/');

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@nibras.test');
    await userEvent.type(screen.getByLabelText('Password'), 'correct password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    const login = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(login[1].credentials).toBe('include');
  });

  it('signs out from a protected page without crashing and lands on /login', async () => {
    let signedIn = true;
    stubApi({
      'GET /auth/session': () => (signedIn ? session(['dashboard.access']) : unauthorized()),
      'POST /auth/logout': () => {
        signedIn = false;
        return { ok: true, status: 204, json: () => Promise.resolve(null) };
      },
    });
    const router = renderAt('/');

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});
