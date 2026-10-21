import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Award, BarChart3, DollarSign, Star, TrendingUp, Users } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Card from '@/components/ui/Card';
import { Segmented } from '@/features/preferences/PreferenceControls';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { analyticsKeys, getAnalyticsSummary, getEnrollmentsOverTime, getRevenueOverTime, getTopCourses } from '@/services/analytics.service';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

const formatPrice = (cents) => (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

function SummaryCard({ icon: Icon, tone, label, value, loading }) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-secondary-soft text-secondary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
  };
  return (
    <motion.div variants={item} className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-elevation-1">
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-sm text-foreground-subtle">{label}</p>
      {loading ? (
        <span className="mt-1 inline-block h-9 w-28 animate-pulse rounded-md bg-surface-muted" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      )}
    </motion.div>
  );
}

/** A minimal bar chart: SVG units are one per day, stretched to its container. Each bar's native <title> is its tooltip. */
function BarChart({ data, tone = 'primary', valueLabel, format }) {
  const colors = { primary: 'fill-primary', success: 'fill-success' };
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const barWidth = 0.7;
  const first = data[0];
  const mid = data[Math.floor(data.length / 2)];
  const last = data.at(-1);

  return (
    <div>
      <svg viewBox={`0 0 ${n} 36`} preserveAspectRatio="none" className="h-36 w-full overflow-visible">
        {data.map((d, i) => {
          const height = Math.max(0.3, (d.value / max) * 34);
          return (
            <rect
              key={d.date}
              x={i + (1 - barWidth) / 2}
              y={36 - height}
              width={barWidth}
              height={height}
              rx={0.12}
              className={cn(colors[tone], 'transition-opacity hover:opacity-70')}
            >
              <title>{`${format.date(d.date, { month: 'short', day: 'numeric' })}: ${valueLabel(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
      {data.length > 0 ? (
        <div className="mt-2 flex justify-between text-xs text-foreground-subtle">
          <span>{format.date(first.date, { month: 'short', day: 'numeric' })}</span>
          <span>{format.date(mid.date, { month: 'short', day: 'numeric' })}</span>
          <span>{format.date(last.date, { month: 'short', day: 'numeric' })}</span>
        </div>
      ) : null}
    </div>
  );
}

function TopCoursesList({ data, locale, valueLabel, emptyLabel }) {
  const max = Math.max(1, ...data.map((c) => c.value));
  if (data.length === 0) return <p className="py-6 text-center text-sm text-foreground-subtle">{emptyLabel}</p>;
  return (
    <ol className="mt-4 space-y-3.5">
      {data.map((c, i) => (
        <li key={c.id}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-foreground">
              <span className="me-1.5 text-foreground-subtle tabular-nums">{i + 1}.</span>
              <span className="font-medium">{locale === 'ar' ? c.titleAr : c.titleEn}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground-muted">{valueLabel(c.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (c.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Admin-only platform analytics: revenue, enrollment growth, certificates and top courses. */
export default function AnalyticsPage() {
  const { t, format, locale } = useI18n();
  const [days, setDays] = useState(30);
  const [topBy, setTopBy] = useState('enrollments');

  const summary = useQuery({ queryKey: analyticsKeys.summary(), queryFn: getAnalyticsSummary });
  const revenue = useQuery({ queryKey: analyticsKeys.revenue(days), queryFn: () => getRevenueOverTime(days) });
  const enrollments = useQuery({ queryKey: analyticsKeys.enrollments(days), queryFn: () => getEnrollmentsOverTime(days) });
  const topCourses = useQuery({ queryKey: analyticsKeys.topCourses(topBy, 5), queryFn: () => getTopCourses(topBy, 5) });

  const errored = summary.isError || revenue.isError || enrollments.isError || topCourses.isError;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <BarChart3 className="size-5" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('analytics.title')}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('analytics.subtitle')}</p>
        </div>
        <Segmented
          label={t('analytics.range.label')}
          value={days}
          onChange={setDays}
          options={[
            { id: 7, label: t('analytics.range.7') },
            { id: 30, label: t('analytics.range.30') },
            { id: 90, label: t('analytics.range.90') },
          ]}
        />
      </motion.header>

      {errored ? (
        <motion.div variants={item} className="mt-4">
          <Alert tone="error" title={errorMessage(summary.error ?? revenue.error ?? enrollments.error ?? topCourses.error, t)} />
        </motion.div>
      ) : null}

      <div className="mt-8 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={DollarSign} tone="success" label={t('analytics.summary.revenue')} value={formatPrice(summary.data?.totalRevenueCents ?? 0)} loading={summary.isPending} />
        <SummaryCard icon={Users} tone="primary" label={t('analytics.summary.enrollments')} value={format.number(summary.data?.totalEnrollments ?? 0)} loading={summary.isPending} />
        <SummaryCard icon={Award} tone="secondary" label={t('analytics.summary.certificates')} value={format.number(summary.data?.totalCertificates ?? 0)} loading={summary.isPending} />
        <SummaryCard
          icon={Star}
          tone="warning"
          label={t('analytics.summary.rating')}
          value={summary.data ? summary.data.averageRating.toFixed(1) : '0.0'}
          loading={summary.isPending}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="size-4 text-success" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">{t('analytics.charts.revenue')}</h2>
          </div>
          {revenue.isPending ? (
            <div className="mt-4 h-36 animate-pulse rounded-lg bg-surface-muted" />
          ) : (
            <div className="mt-4">
              <BarChart data={revenue.data ?? []} tone="success" valueLabel={formatPrice} format={format} />
            </div>
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2.5">
            <Users className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">{t('analytics.charts.enrollments')}</h2>
          </div>
          {enrollments.isPending ? (
            <div className="mt-4 h-36 animate-pulse rounded-lg bg-surface-muted" />
          ) : (
            <div className="mt-4">
              <BarChart data={enrollments.data ?? []} tone="primary" valueLabel={(v) => format.number(v)} format={format} />
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">{t('analytics.topCourses.title')}</h2>
          <Segmented
            label={t('analytics.topCourses.title')}
            value={topBy}
            onChange={setTopBy}
            options={[
              { id: 'enrollments', label: t('analytics.topCourses.byEnrollments') },
              { id: 'revenue', label: t('analytics.topCourses.byRevenue') },
            ]}
          />
        </div>
        {topCourses.isPending ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : (
          <TopCoursesList
            data={topCourses.data ?? []}
            locale={locale}
            valueLabel={topBy === 'revenue' ? formatPrice : (v) => format.number(v)}
            emptyLabel={t('analytics.topCourses.empty')}
          />
        )}
      </Card>
    </motion.div>
  );
}
