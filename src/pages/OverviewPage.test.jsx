import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import I18nProvider from '@/i18n/I18nProvider';
import { CurrentUserContext } from '@/features/auth/current-user';
import OverviewPage from './OverviewPage';

// Rendered behind RequireAuth in the app, which provides the user. OverviewPage picks the admin
// bento (API health tile included) over the instructor one based on the `courses.manage`
// permission specifically, not the `ADMIN` role name — this fixture needs it to exercise that view.
const SESSION = { user: { name: 'Ada Admin', roles: ['ADMIN'], permissions: ['dashboard.access', 'courses.manage'] }, csrfToken: 'c' };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <I18nProvider locale="en">
        <QueryClientProvider client={client}>
          <CurrentUserContext.Provider value={SESSION.user}>
            <OverviewPage />
          </CurrentUserContext.Provider>
        </QueryClientProvider>
      </I18nProvider>
    </MemoryRouter>,
  );
}

function stubFetch(status, body) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: status < 300, status, json: () => Promise.resolve(body) }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('OverviewPage', () => {
  it('shows operational status with database and version from the API', async () => {
    stubFetch(200, { success: true, data: { status: 'ok', database: 'up', version: '0.1.0' } });
    renderPage();

    expect(await screen.findByText('Operational')).toBeInTheDocument();
    expect(screen.getByText('up')).toBeInTheDocument();
    expect(screen.getByText('0.1.0')).toBeInTheDocument();
  });

  it('shows degraded status when the API reports 503', async () => {
    stubFetch(503, { success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Database unavailable' } });
    renderPage();
    expect(await screen.findByText('Degraded')).toBeInTheDocument();
  });

  it('shows unreachable status on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    renderPage();
    expect(await screen.findByText('Unreachable')).toBeInTheDocument();
  });
});
