import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import I18nProvider from '@/i18n/I18nProvider';
import { CurrentUserContext } from '@/features/auth/current-user';
import OverviewPage from './OverviewPage';

// Rendered behind RequireAuth in the app, which provides the user. OverviewPage picks the admin
// bento over the instructor one based on the `courses.manage` permission specifically, not the
// `ADMIN` role name — this fixture needs it to exercise that view.
const SESSION = { user: { name: 'Ada Admin', roles: ['ADMIN'], permissions: ['dashboard.access', 'courses.manage'] } };

const ENVELOPE = (data, meta = {}) => ({ success: true, data, meta });

/** Routes each fetch by its path to canned admin-overview responses — the page fires five
 * independent queries (home stats, analytics summary, courses, pending orders, audit log). */
function stubOverviewFetch({ courses = [], orders = [], auditItems = [] } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input) => {
      const url = String(typeof input === 'string' ? input : input?.url ?? input);
      if (url.includes('/home/stats')) {
        return Promise.resolve(jsonResponse(ENVELOPE({ learners: 120, instructors: 8, courses: 24 })));
      }
      if (url.includes('/admin/analytics/summary')) {
        return Promise.resolve(jsonResponse(ENVELOPE({ totalRevenueCents: 543200, totalEnrollments: 87, totalCertificates: 12, averageRating: 4.6 })));
      }
      if (url.includes('/admin/courses')) {
        return Promise.resolve(jsonResponse(ENVELOPE(courses)));
      }
      if (url.includes('/admin/orders')) {
        return Promise.resolve(jsonResponse(ENVELOPE(orders)));
      }
      if (url.includes('/admin/audit-logs')) {
        return Promise.resolve(jsonResponse(ENVELOPE(auditItems, { pagination: { total: auditItems.length } })));
      }
      return Promise.resolve(jsonResponse(ENVELOPE(null)));
    }),
  );
}

function jsonResponse(body) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

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

afterEach(() => vi.unstubAllGlobals());

describe('OverviewPage (admin)', () => {
  it('shows platform counts and the 30-day revenue/enrollment/certificate/rating snapshot', async () => {
    stubOverviewFetch();
    renderPage();

    expect(await screen.findByText('Learners')).toBeInTheDocument();
    expect(screen.getByText('Instructors')).toBeInTheDocument();
    expect(screen.getByText('Published courses')).toBeInTheDocument();
    expect(await screen.findByText('Total enrollments')).toBeInTheDocument();
    expect(screen.getByText('Certificates issued')).toBeInTheDocument();
    expect(screen.getByText('Average rating')).toBeInTheDocument();
    // The old "API connection" tile is gone for good, not just hidden.
    expect(screen.queryByText('API connection')).not.toBeInTheDocument();
  });

  it('highlights pending course approvals and orders when there are some, with a link to act on them', async () => {
    stubOverviewFetch({
      courses: [{ id: 'c1', publishRequestedAt: '2026-01-01T00:00:00Z' }, { id: 'c2', publishRequestedAt: null }],
      orders: [{ id: 'o1', status: 'PENDING' }],
    });
    renderPage();

    expect(await screen.findByText('1 course is waiting for your review.')).toBeInTheDocument();
    expect(screen.getByText('1 order hasn’t been paid yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review courses' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: 'View orders' })).toHaveAttribute('href', '/orders');
  });

  it('shows the calm empty state, with no action link, when nothing is pending', async () => {
    stubOverviewFetch({ courses: [], orders: [] });
    renderPage();

    expect(await screen.findByText('Nothing waiting on you.')).toBeInTheDocument();
    expect(screen.getByText('No orders waiting on confirmation.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review courses' })).not.toBeInTheDocument();
  });

  it('lists recent activity using the same translated labels as the full Audit Log page', async () => {
    stubOverviewFetch({ auditItems: [{ id: 'a1', action: 'course.published', createdAt: new Date().toISOString() }] });
    renderPage();
    expect(await screen.findByText('Published a course')).toBeInTheDocument();
  });

  it('shows an empty message when there is no recent activity', async () => {
    stubOverviewFetch({ auditItems: [] });
    renderPage();
    expect(await screen.findByText('No activity yet.')).toBeInTheDocument();
  });
});
