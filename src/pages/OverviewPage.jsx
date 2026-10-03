import { useQuery } from '@tanstack/react-query';
import { Activity, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useCurrentUser } from '@/features/auth/current-user';
import { useI18n } from '@/i18n/I18nProvider';
import { API_URL } from '@/services/api-client';
import { getApiHealth, systemKeys } from '@/services/system.service';

function statusOf(query) {
  if (query.isPending) return { key: 'checking', tone: 'bg-foreground-subtle', text: 'text-foreground-muted' };
  if (query.isError) {
    return query.error.status === 503
      ? { key: 'degraded', tone: 'bg-warning', text: 'text-warning' }
      : { key: 'down', tone: 'bg-error', text: 'text-error' };
  }
  return { key: 'ok', tone: 'bg-success', text: 'text-success' };
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

/**
 * Overview: greeting, platform health and the signed-in admin's access. Learning,
 * revenue and growth analytics join here as their modules ship.
 */
export default function OverviewPage() {
  const { t } = useI18n();
  const user = useCurrentUser();
  const health = useQuery({
    queryKey: systemKeys.health(),
    queryFn: ({ signal }) => getApiHealth({ signal }),
    refetchInterval: 30_000,
  });
  const status = statusOf(health);
  // A 503 still reports database/version in the error details.
  const info = health.data ?? health.error?.details;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={item}>
        <p className="text-sm text-foreground-subtle">{t('overview.greeting', { name: user.name.split(' ')[0] })}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{t('overview.title')}</h1>
        <p className="mt-2 max-w-2xl text-foreground-muted">{t('overview.subtitle')}</p>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <motion.section variants={item} aria-labelledby="api-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-elevation-1">
          <div className="flex items-center justify-between gap-4">
            <h2 id="api-heading" className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
                <Activity className="size-4" aria-hidden="true" />
              </span>
              {t('overview.api.title')}
            </h2>
            <button
              type="button"
              onClick={() => health.refetch()}
              disabled={health.isFetching}
              className="inline-flex h-9 items-center rounded-md border border-border-strong px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              {health.isFetching ? t('overview.api.checking') : t('overview.api.recheck')}
            </button>
          </div>

          <output className="mt-5 flex items-center gap-2.5" aria-live="polite">
            <span className={`size-2.5 rounded-full ${status.tone}`} aria-hidden="true" />
            <span className={`text-sm font-medium ${status.text}`}>{t(`overview.api.${status.key}`)}</span>
          </output>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-foreground-subtle">{t('overview.api.endpoint')}</dt>
              <dd dir="ltr" className="mt-0.5 truncate text-start font-mono text-foreground">
                {API_URL}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">{t('overview.api.database')}</dt>
              <dd className="mt-0.5 font-mono text-foreground">{info?.database ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">{t('overview.api.version')}</dt>
              <dd className="mt-0.5 font-mono text-foreground">{info?.version ?? '—'}</dd>
            </div>
          </dl>
        </motion.section>

        <motion.section variants={item} aria-labelledby="access-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-elevation-1">
          <h2 id="access-heading" className="flex items-center gap-2.5 text-sm font-medium text-foreground">
            <span className="grid size-8 place-items-center rounded-lg bg-secondary-soft text-secondary">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            {t('overview.account.title')}
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-foreground-subtle">{t('overview.account.roles')}</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <span key={role} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                    {t(`roles.${role}`)}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="sr-only">{t('overview.account.title')}</dt>
              <dd className="text-foreground-muted">{t('overview.account.permissions', { count: user.permissions.length })}</dd>
            </div>
          </dl>
        </motion.section>
      </div>
    </motion.div>
  );
}
