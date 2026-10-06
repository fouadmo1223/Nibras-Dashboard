import { useQuery } from '@tanstack/react-query';
import { Activity, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCurrentUser } from '@/features/auth/current-user';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { API_URL } from '@/services/api-client';
import { getApiHealth, getHomeStats, systemKeys } from '@/services/system.service';

const STATUS = {
  checking: { tone: 'bg-foreground-subtle', text: 'text-foreground-muted', ring: 'ring-foreground-subtle/30' },
  degraded: { tone: 'bg-warning', text: 'text-warning', ring: 'ring-warning/30' },
  down: { tone: 'bg-error', text: 'text-error', ring: 'ring-error/30' },
  ok: { tone: 'bg-success', text: 'text-success', ring: 'ring-success/30' },
};

function statusOf(query) {
  if (query.isPending) return 'checking';
  if (query.isError) return query.error.status === 503 ? 'degraded' : 'down';
  return 'ok';
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

/** A bento tile: consistent surface, header with icon, and optional footer. Full height in its grid cell. */
function Tile({ icon: Icon, title, tone = 'primary', className, children }) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-secondary-soft text-secondary',
    success: 'bg-success-soft text-success',
  };
  return (
    <motion.section variants={item} className={cn('flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-elevation-1', className)}>
      <header className="flex items-center gap-3">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </motion.section>
  );
}

/** A count with a soft bar showing its share of the largest count. */
function Metric({ label, value, max, loading, loadingLabel, format }) {
  const reduce = useReducedMotion();
  const share = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <p className="text-sm text-foreground-subtle">{label}</p>
      {loading ? (
        <span className="mt-2 inline-block h-9 w-20 animate-pulse rounded-md bg-surface-muted" aria-label={loadingLabel} />
      ) : (
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-foreground">{format.number(value)}</p>
      )}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
          initial={false}
          animate={{ width: loading ? '0%' : `${share}%` }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.2, 0, 0, 1] }}
        />
      </div>
    </div>
  );
}

/**
 * Overview bento: greeting, API health, platform counts and the admin's access. Learning,
 * revenue and growth tiles join as their modules ship.
 */
export default function OverviewPage() {
  const { t, format } = useI18n();
  const user = useCurrentUser();
  const health = useQuery({
    queryKey: systemKeys.health(),
    queryFn: ({ signal }) => getApiHealth({ signal }),
    refetchInterval: 30_000,
  });
  const platform = useQuery({
    queryKey: systemKeys.homeStats(),
    queryFn: ({ signal }) => getHomeStats({ signal }),
    staleTime: 60_000,
  });
  const statusKey = statusOf(health);
  const status = STATUS[statusKey];
  // A 503 still reports database/version in the error details.
  const info = health.data ?? health.error?.details;
  const learners = platform.data?.learners ?? 0;
  const instructors = platform.data?.instructors ?? 0;
  const max = Math.max(learners, instructors, 1);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-foreground-subtle">{t('overview.greeting', { name: user.name.split(' ')[0] })}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{t('overview.title')}</h1>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('overview.subtitle')}</p>
        </div>
      </motion.header>

      <div className="mt-8 grid auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* API health: a wide tile with status, the endpoint on its own line, and the database and version. */}
        <Tile icon={Activity} title={t('overview.api.title')} className="md:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <output className="flex items-center gap-3" aria-live="polite">
              <span className="relative flex size-3">
                {statusKey === 'ok' && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', status.tone)} />}
                <span className={cn('relative inline-flex size-3 rounded-full ring-4', status.tone, status.ring)} />
              </span>
              <span className={cn('text-lg font-semibold', status.text)}>{t(`overview.api.${statusKey}`)}</span>
            </output>
            <button
              type="button"
              onClick={() => health.refetch()}
              disabled={health.isFetching}
              className="inline-flex h-9 items-center rounded-lg border border-border-strong px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              {health.isFetching ? t('overview.api.checking') : t('overview.api.recheck')}
            </button>
          </div>

          <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-border pt-5 sm:grid-cols-3">
            <div className="min-w-0 sm:col-span-3">
              <dt className="text-xs uppercase tracking-wider text-foreground-subtle">{t('overview.api.endpoint')}</dt>
              <dd dir="ltr" className="mt-1 truncate text-start font-mono text-sm text-foreground" title={API_URL}>
                {API_URL}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-foreground-subtle">{t('overview.api.database')}</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">{info?.database ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-foreground-subtle">{t('overview.api.version')}</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">{info?.version ?? '—'}</dd>
            </div>
          </dl>
        </Tile>

        {/* Your access. */}
        <Tile icon={ShieldCheck} title={t('overview.account.title')} tone="secondary">
          <p className="text-xs uppercase tracking-wider text-foreground-subtle">{t('overview.account.roles')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <span key={role} className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                {t(`roles.${role}`)}
              </span>
            ))}
          </div>
          <p className="mt-auto pt-6 text-sm text-foreground-muted">{t('overview.account.permissions', { count: user.permissions.length })}</p>
        </Tile>

        {/* Platform counts: learners and instructors, each with its share of the larger count. */}
        <Tile icon={Users} title={t('overview.platform.title')} className="md:col-span-2 lg:col-span-2">
          <div className="grid h-full gap-8 sm:grid-cols-2">
            <Metric
              label={t('overview.platform.learners')}
              value={learners}
              max={max}
              loading={platform.isPending}
              loadingLabel={t('overview.platform.loading')}
              format={format}
            />
            <Metric
              label={t('overview.platform.instructors')}
              value={instructors}
              max={max}
              loading={platform.isPending}
              loadingLabel={t('overview.platform.loading')}
              format={format}
            />
          </div>
          {platform.isError ? <p className="mt-4 text-sm text-error">{errorMessage(platform.error, t)}</p> : null}
        </Tile>

        {/* Says what arrives next, without fake numbers. */}
        <Tile icon={GraduationCap} title={t('overview.next.title')}>
          <p className="text-sm leading-6 text-foreground-muted">{t('overview.next.body')}</p>
        </Tile>
      </div>
    </motion.div>
  );
}
