import { useQuery } from '@tanstack/react-query';
import { getApiHealth, systemKeys } from '@/services/system.service';
import { API_URL } from '@/services/api-client';
import Logo from '@/components/ui/Logo';

function statusOf(query) {
  if (query.isPending) return { label: 'Checking…', tone: 'bg-foreground-subtle', text: 'text-foreground-muted' };
  if (query.isError) {
    return query.error.status === 503
      ? { label: 'Degraded', tone: 'bg-warning', text: 'text-warning' }
      : { label: 'Unreachable', tone: 'bg-error', text: 'text-error' };
  }
  return { label: 'Operational', tone: 'bg-success', text: 'text-success' };
}

/**
 * Phase 1 foundation screen: confirms tokens render and the dashboard can
 * reach the API. Replaced by the real shell + overview in Phases 3–4.
 */
export default function FoundationPage() {
  const health = useQuery({
    queryKey: systemKeys.health(),
    queryFn: ({ signal }) => getApiHealth({ signal }),
    refetchInterval: 30_000,
  });
  const status = statusOf(health);
  // A 503 still reports database/version in the error details.
  const info = health.data ?? health.error?.details;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center px-6 py-16">
      <Logo label="Admin" className="mb-10" />
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground-subtle">Admin · Phase 1</p>
      <h1 className="mt-4 text-4xl font-semibold text-foreground">Dashboard foundation</h1>
      <p className="mt-3 max-w-lg text-foreground-muted">
        React, Vite, Tailwind and TanStack Query are wired to the shared design tokens and the NestJS API.
      </p>

      <section
        aria-labelledby="api-heading"
        className="mt-10 rounded-xl border border-border bg-surface p-6 shadow-elevation-1"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="api-heading" className="text-sm font-medium text-foreground">
            API connection
          </h2>
          <button
            type="button"
            onClick={() => health.refetch()}
            disabled={health.isFetching}
            className="inline-flex h-9 items-center rounded-md border border-border-strong px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            {health.isFetching ? 'Checking…' : 'Re-check'}
          </button>
        </div>

        <output className="mt-5 flex items-center gap-2.5" aria-live="polite">
          <span className={`size-2.5 rounded-full ${status.tone}`} aria-hidden="true" />
          <span className={`text-sm font-medium ${status.text}`}>{status.label}</span>
        </output>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-foreground-subtle">Endpoint</dt>
            <dd className="mt-0.5 truncate font-mono text-foreground">{API_URL}</dd>
          </div>
          <div>
            <dt className="text-foreground-subtle">Database</dt>
            <dd className="mt-0.5 font-mono text-foreground">{info?.database ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-foreground-subtle">Version</dt>
            <dd className="mt-0.5 font-mono text-foreground">{info?.version ?? '—'}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
