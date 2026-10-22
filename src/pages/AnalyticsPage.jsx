import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Award, BarChart3, DollarSign, Download, Star, TrendingDown, TrendingUp, Users } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Card from '@/components/ui/Card';
import DatePicker from '@/components/ui/DatePicker';
import Menu from '@/components/ui/Menu';
import { Segmented } from '@/features/preferences/PreferenceControls';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { analyticsExportUrl, analyticsKeys, getAnalyticsSummary, getEnrollmentsOverTime, getRevenueOverTime, getTopCourses } from '@/services/analytics.service';
import { categoryKeys, listCategories } from '@/services/categories.service';
import { instructorKeys, listInstructors } from '@/services/instructors.service';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

const formatPrice = (cents) => (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
const toISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Resolves the UI's range state to concrete `{from, to}` ISO strings — client-side mirror of the backend's own `days` default, so a "previous period" comparison can be computed without a round trip. */
function resolveRange({ preset, customFrom, customTo }) {
  const today = new Date();
  if (preset === 'custom' && customFrom && customTo) return { from: customFrom, to: customTo };
  const days = typeof preset === 'number' ? preset : 30;
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  return { from: toISO(from), to: toISO(today) };
}

/** The equal-length period immediately before `{from, to}`, for a "vs. last period" comparison. */
function previousRange({ from, to }) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const spanMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 86_400_000);
  const prevFrom = new Date(prevTo.getTime() - spanMs);
  return { from: toISO(prevFrom), to: toISO(prevTo) };
}

/** A filter dropdown built on the shared `Menu` component — same pattern as ReviewsPage's. */
function FilterMenu({ label, value, options, onChange }) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  return (
    <Menu
      label={label}
      align="start"
      items={options.map((option) => ({ id: option.value || 'all', label: option.label, selected: option.value === value, onSelect: () => onChange(option.value) }))}
      triggerContent={
        <>
          <span className="text-foreground-subtle">{label}:</span>
          <span className="font-medium text-foreground">{selected.label}</span>
        </>
      }
      triggerClassName="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3.5 text-sm transition-colors hover:bg-surface-muted"
    />
  );
}

function Delta({ current, previous, format }) {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct) || pct === 0) return null;
  const up = pct > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-success' : 'text-error')}>
      {up ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
      {format.number(Math.abs(pct), { maximumFractionDigits: 0 })}%
    </span>
  );
}

function SummaryCard({ icon: Icon, tone, label, value, delta, loading }) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-secondary-soft text-secondary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
  };
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-elevation-1"
    >
      <div className="flex items-center justify-between">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {!loading ? delta : null}
      </div>
      <p className="mt-5 text-sm text-foreground-subtle">{label}</p>
      {loading ? (
        <span className="mt-1 inline-block h-9 w-28 animate-pulse rounded-md bg-surface-muted" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      )}
    </motion.div>
  );
}

/** A minimal, animated bar chart: SVG units are one per day, stretched to its container. Each bar's native <title> is its tooltip. */
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
            <motion.rect
              key={d.date}
              x={i + (1 - barWidth) / 2}
              initial={{ height: 0, y: 36 }}
              animate={{ height, y: 36 - height }}
              transition={{ duration: 0.5, delay: Math.min(i, 40) * 0.012, ease: [0.2, 0, 0, 1] }}
              width={barWidth}
              rx={0.12}
              className={cn(colors[tone], 'transition-opacity hover:opacity-70')}
            >
              <title>{`${format.date(d.date, { month: 'short', day: 'numeric' })}: ${valueLabel(d.value)}`}</title>
            </motion.rect>
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
        <motion.li key={c.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-foreground">
              <span className="me-1.5 text-foreground-subtle tabular-nums">{i + 1}.</span>
              <span className="font-medium">{locale === 'ar' ? c.titleAr : c.titleEn}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground-muted">{valueLabel(c.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, (c.value / max) * 100)}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.2, 0, 0, 1] }}
            />
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

/** Admin-only platform analytics: revenue, enrollment growth, certificates, top courses — filterable by category/instructor and a custom date range, exportable as a PDF. */
export default function AnalyticsPage() {
  const { t, format, locale } = useI18n();
  const [preset, setPreset] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [topBy, setTopBy] = useState('enrollments');

  const range = useMemo(() => resolveRange({ preset, customFrom, customTo }), [preset, customFrom, customTo]);
  const prevRange = useMemo(() => previousRange(range), [range]);

  const baseFilters = { categoryId: categoryId || undefined, instructorId: instructorId || undefined };
  const query = { ...range, ...baseFilters };
  const prevQuery = { ...prevRange, ...baseFilters };

  const categories = useQuery({ queryKey: categoryKeys.admin(), queryFn: listCategories });
  const instructors = useQuery({ queryKey: instructorKeys.admin(), queryFn: listInstructors });

  const summary = useQuery({ queryKey: analyticsKeys.summary(query), queryFn: () => getAnalyticsSummary(query) });
  const prevSummary = useQuery({ queryKey: analyticsKeys.summary(prevQuery), queryFn: () => getAnalyticsSummary(prevQuery) });
  const revenue = useQuery({ queryKey: analyticsKeys.revenue(query), queryFn: () => getRevenueOverTime(query) });
  const enrollments = useQuery({ queryKey: analyticsKeys.enrollments(query), queryFn: () => getEnrollmentsOverTime(query) });
  const topCourses = useQuery({ queryKey: analyticsKeys.topCourses({ ...query, by: topBy }), queryFn: () => getTopCourses({ ...query, by: topBy, limit: 5 }) });

  const errored = summary.isError || revenue.isError || enrollments.isError || topCourses.isError;
  const customInvalid = preset === 'custom' && (!customFrom || !customTo);

  const categoryOptions = [{ value: '', label: t('common.all') }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: locale === 'ar' ? c.nameAr : c.nameEn }))];
  const instructorOptions = [{ value: '', label: t('common.all') }, ...(instructors.data ?? []).map((i) => ({ value: i.id, label: i.user.name }))];

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
        <a
          href={analyticsExportUrl({ ...query, by: topBy })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elevation-1 transition-[background-color,box-shadow,transform] hover:scale-[1.02] hover:bg-primary-hover hover:shadow-elevation-2"
        >
          <Download className="size-4" aria-hidden="true" />
          {t('analytics.export')}
        </a>
      </motion.header>

      <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-2">
        <Segmented
          label={t('analytics.range.label')}
          value={preset}
          onChange={setPreset}
          options={[
            { id: 7, label: t('analytics.range.7') },
            { id: 30, label: t('analytics.range.30') },
            { id: 90, label: t('analytics.range.90') },
            { id: 'custom', label: t('analytics.range.custom') },
          ]}
        />
        {preset === 'custom' ? (
          <>
            <DatePicker value={customFrom} onChange={setCustomFrom} placeholder={t('analytics.range.from')} label={t('analytics.range.from')} className="w-44" />
            <DatePicker value={customTo} onChange={setCustomTo} placeholder={t('analytics.range.to')} label={t('analytics.range.to')} className="w-44" />
          </>
        ) : null}
        <FilterMenu label={t('analytics.filters.category')} value={categoryId} options={categoryOptions} onChange={setCategoryId} />
        <FilterMenu label={t('analytics.filters.instructor')} value={instructorId} options={instructorOptions} onChange={setInstructorId} />
      </motion.div>

      {customInvalid ? (
        <motion.div variants={item} className="mt-4">
          <Alert tone="info" title={t('analytics.range.customIncomplete')} />
        </motion.div>
      ) : errored ? (
        <motion.div variants={item} className="mt-4">
          <Alert tone="error" title={errorMessage(summary.error ?? revenue.error ?? enrollments.error ?? topCourses.error, t)} />
        </motion.div>
      ) : null}

      <div className="mt-8 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={DollarSign}
          tone="success"
          label={t('analytics.summary.revenue')}
          value={formatPrice(summary.data?.totalRevenueCents ?? 0)}
          delta={<Delta current={summary.data?.totalRevenueCents ?? 0} previous={prevSummary.data?.totalRevenueCents} format={format} />}
          loading={summary.isPending}
        />
        <SummaryCard
          icon={Users}
          tone="primary"
          label={t('analytics.summary.enrollments')}
          value={format.number(summary.data?.totalEnrollments ?? 0)}
          delta={<Delta current={summary.data?.totalEnrollments ?? 0} previous={prevSummary.data?.totalEnrollments} format={format} />}
          loading={summary.isPending}
        />
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
