import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { CurrentUserContext } from '@/features/auth/current-user';
import I18nProvider from '@/i18n/I18nProvider';
import OverviewPage from '@/pages/OverviewPage';
import SettingsPage from '@/pages/SettingsPage';
import { DEFAULT_PREFERENCES, usePreferences } from '@/stores/preferences-store';
import AppShell from './AppShell';

const USER = { name: 'Ada Admin', email: 'ada@nibras.test', roles: ['ADMIN'], permissions: ['dashboard.access'], avatarUrl: null };

beforeAll(() => {
  // jsdom lacks the <dialog> modal API used by the palette, drawer and confirm dialogs.
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close() {
    this.open = false;
  };
});

beforeEach(() => {
  act(() => usePreferences.setState({ ...DEFAULT_PREFERENCES, locale: 'en' }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ success: true, data: { database: 'up', version: '0.1.0' } }) }));
});
afterEach(() => vi.unstubAllGlobals());

function renderShell(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <OverviewPage />, handle: { crumb: 'nav.overview' } },
          { path: 'settings', element: <SettingsPage />, handle: { crumb: 'nav.settings' } },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <CurrentUserContext.Provider value={USER}>
          <RouterProvider router={router} />
        </CurrentUserContext.Provider>
      </QueryClientProvider>
    </I18nProvider>,
  );
  return router;
}

describe('AppShell', () => {
  it('shows navigation, breadcrumbs and the current page', async () => {
    renderShell('/settings');
    expect(await screen.findByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(within(crumbs).getByText('Settings')).toHaveAttribute('aria-current', 'page');
    const nav = screen.getAllByRole('navigation', { name: 'Main navigation' })[0];
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
  });

  it('collapses the sidebar with the button and Ctrl+B, and remembers it', async () => {
    renderShell();
    await userEvent.click(await screen.findByRole('button', { name: 'Collapse sidebar' }));
    expect(usePreferences.getState().sidebar).toBe('compact');
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();

    await userEvent.keyboard('{Control>}b{/Control}');
    expect(usePreferences.getState().sidebar).toBe('expanded');
    expect(JSON.parse(localStorage.getItem('nibras.dashboard.preferences')).state.sidebar).toBe('expanded');
  });

  it('opens the command palette with Ctrl+K, filters, and navigates with the keyboard', async () => {
    const router = renderShell();
    await screen.findByRole('heading', { name: 'Overview', level: 1 });

    await userEvent.keyboard('{Control>}k{/Control}');
    const input = screen.getByRole('combobox', { name: 'Command palette' });
    expect(input).toHaveFocus();

    await userEvent.type(input, 'sett');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Settings']);
    await userEvent.keyboard('{Enter}');
    expect(router.state.location.pathname).toBe('/settings');
  });

  it('runs actions from the palette (theme)', async () => {
    renderShell();
    await screen.findByRole('heading', { name: 'Overview', level: 1 });
    await userEvent.keyboard('{Control>}k{/Control}');
    await userEvent.type(screen.getByRole('combobox'), 'dark');
    await userEvent.keyboard('{Enter}');
    expect(usePreferences.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('switches to Arabic: translated, right-to-left', async () => {
    renderShell('/settings');
    await screen.findByRole('heading', { name: 'Settings', level: 1 });
    await userEvent.click(screen.getByRole('radio', { name: 'العربية' }));

    expect(await screen.findByRole('heading', { name: 'الإعدادات', level: 1 })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('applies accent presets to <html> for the generated token CSS', async () => {
    renderShell('/settings');
    const primary = await screen.findByRole('radiogroup', { name: 'Primary color' });
    await userEvent.click(within(primary).getByRole('radio', { name: 'Teal' }));
    expect(document.documentElement.dataset.primary).toBe('teal');
    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(document.documentElement.dataset.primary).toBe('cobalt');
  });
});
