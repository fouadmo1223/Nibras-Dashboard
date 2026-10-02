import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FoundationPage from './FoundationPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FoundationPage />
    </QueryClientProvider>,
  );
}

function stubFetch(status, body) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: status < 300, status, json: () => Promise.resolve(body) }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('FoundationPage', () => {
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
