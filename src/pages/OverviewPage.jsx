import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  Award,
  BookOpen,
  Clock,
  DollarSign,
  FileEdit,
  FolderTree,
  GraduationCap,
  LogIn,
  MessageSquare,
  Rocket,
  Scale,
  ScrollText,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Star,
  Ticket,
  TrendingUp,
  Users,
  Users as UsersIcon,
} from 'lucide-react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useCurrentUser } from '@/features/auth/current-user';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { analyticsKeys, getAnalyticsSummary } from '@/services/analytics.service';
import { auditLogKeys, listAuditLogs } from '@/services/audit-logs.service';
import { courseKeys, getMyCourseStats, listCourses } from '@/services/courses.service';
import { listOrders, orderKeys } from '@/services/orders.service';
import { getHomeStats, systemKeys } from '@/services/system.service';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
const rows_ = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const row = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.3 } } };

const toISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const last30Days = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: toISO(from), to: toISO(to) };
};

/** Animates a number counting up from 0 to `target` whenever it changes — skipped under Reduce Motion. */
function useCountUp(target) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) {
      setValue(target);
      return undefined;
    }
    const controls = animate(0, target, { duration: 0.9, ease: [0.2, 0, 0, 1], onUpdate: setValue });
    return () => controls.stop();
  }, [target, reduce]);
  return value;
}

/** A bento tile: consistent surface, header with icon, and optional footer. Full height in its grid cell. */
function Tile({ icon: Icon, title, tone = 'primary', className, children }) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-secondary-soft text-secondary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
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

/** A standalone count card: icon badge, a count-up number (optionally custom-formatted, e.g. currency), and its share of the largest value as a bar. */
function StatCard({ icon: Icon, tone = 'primary', label, value, max, loading, loadingLabel, format, formatValue, className }) {
  const reduce = useReducedMotion();
  const share = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  const animated = useCountUp(loading ? 0 : value);
  const tones = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-secondary-soft text-secondary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
  };
  const bars = { primary: 'bg-primary', secondary: 'bg-secondary', success: 'bg-success', warning: 'bg-warning' };
  const display = formatValue ? formatValue(animated) : format.number(Math.round(animated));
  return (
    <motion.section variants={item} className={cn('flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-elevation-1', className)}>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tones[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-sm text-foreground-subtle">{label}</p>
      {loading ? (
        <span className="mt-1 inline-block h-9 w-20 animate-pulse rounded-md bg-surface-muted" aria-label={loadingLabel} />
      ) : (
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-foreground">{display}</p>
      )}
      <div className="mt-auto pt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
          <motion.div
            className={cn('h-full rounded-full', bars[tone])}
            initial={false}
            animate={{ width: loading ? '0%' : `${share}%` }}
            transition={{ duration: reduce ? 0 : 0.9, ease: [0.2, 0, 0, 1] }}
          />
        </div>
      </div>
    </motion.section>
  );
}

/** A compact "needs your attention" tile: a big count, short body, and a link — warm when there's something to do, calm when there isn't. */
function ActionTile({ icon: Icon, title, count, loading, body, emptyBody, to, cta, format }) {
  const hasWork = !loading && count > 0;
  return (
    <motion.section
      variants={item}
      className={cn(
        'flex h-full flex-col rounded-2xl border p-6 shadow-elevation-1 transition-colors',
        hasWork ? 'border-warning/30 bg-warning-soft/40' : 'border-border bg-surface',
      )}
    >
      <header className="flex items-center gap-3">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', hasWork ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success')}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </header>
      <div className="mt-5 flex-1">
        {loading ? (
          <span className="inline-block h-9 w-16 animate-pulse rounded-md bg-surface-muted" />
        ) : (
          <p className="text-4xl font-semibold tracking-tight tabular-nums text-foreground">{format.number(count)}</p>
        )}
        <p className="mt-2 text-sm text-foreground-muted">{hasWork ? body : emptyBody}</p>
      </div>
      {hasWork ? (
        <Link
          to={to}
          className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 self-start rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          {cta}
        </Link>
      ) : null}
    </motion.section>
  );
}

const ACTION_ICONS = {
  auth: LogIn,
  user: UsersIcon,
  role: Shield,
  course: BookOpen,
  order: ShoppingCart,
  coupon: Ticket,
  review: Star,
  category: FolderTree,
  instructor: GraduationCap,
  quiz: Scale,
  discussion: MessageSquare,
};

/** Falls back to the raw dotted key when no translation exists for it yet. */
function translateOrRaw(t, key, raw) {
  const label = t(key);
  return label === key ? raw : label;
}

/** An instructor's own overview: their courses by publish state, and their total enrolled students — never platform-wide numbers. */
function InstructorOverview() {
  const { t, format } = useI18n();
  const user = useCurrentUser();
  const stats = useQuery({ queryKey: courseKeys.myStats(), queryFn: getMyCourseStats, staleTime: 30_000 });
  const data = stats.data ?? { totalCourses: 0, publishedCount: 0, pendingCount: 0, draftCount: 0, studentCount: 0 };
  const max = Math.max(data.totalCourses, data.studentCount, 1);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-foreground-subtle">{t('overview.greeting', { name: user.name.split(' ')[0] })}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{t('overview.title')}</h1>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('overview.mine.subtitle')}</p>
        </div>
        <Link
          to="/my-courses"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elevation-1 transition-[background-color,box-shadow,transform] hover:scale-[1.02] hover:bg-primary-hover hover:shadow-elevation-2"
        >
          <BookOpen className="size-4" aria-hidden="true" />
          {t('overview.mine.viewCourses')}
        </Link>
      </motion.header>

      {stats.isError ? (
        <motion.p variants={item} className="mt-4 text-sm text-error">
          {errorMessage(stats.error, t)}
        </motion.p>
      ) : null}

      <div className="mt-8 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          tone="primary"
          label={t('overview.mine.totalCourses')}
          value={data.totalCourses}
          max={max}
          loading={stats.isPending}
          loadingLabel={t('overview.mine.loading')}
          format={format}
        />
        <StatCard
          icon={Rocket}
          tone="success"
          label={t('overview.mine.published')}
          value={data.publishedCount}
          max={max}
          loading={stats.isPending}
          loadingLabel={t('overview.mine.loading')}
          format={format}
        />
        <StatCard
          icon={Clock}
          tone="warning"
          label={t('overview.mine.pending')}
          value={data.pendingCount}
          max={max}
          loading={stats.isPending}
          loadingLabel={t('overview.mine.loading')}
          format={format}
        />
        <StatCard
          icon={FileEdit}
          tone="secondary"
          label={t('overview.mine.draft')}
          value={data.draftCount}
          max={max}
          loading={stats.isPending}
          loadingLabel={t('overview.mine.loading')}
          format={format}
        />
        <StatCard
          icon={Users}
          tone="primary"
          label={t('overview.mine.students')}
          value={data.studentCount}
          max={max}
          loading={stats.isPending}
          loadingLabel={t('overview.mine.loading')}
          format={format}
          className="sm:col-span-2 lg:col-span-4"
        />
      </div>
    </motion.div>
  );
}

/** Admin overview: platform counts, revenue/enrollment/certificate/rating snapshot, what needs attention, and recent activity. */
function AdminOverview() {
  const { t, format } = useI18n();
  const user = useCurrentUser();
  const range = useMemo(() => last30Days(), []);

  const platform = useQuery({ queryKey: systemKeys.homeStats(), queryFn: ({ signal }) => getHomeStats({ signal }), staleTime: 60_000 });
  const summary = useQuery({ queryKey: analyticsKeys.summary(range), queryFn: () => getAnalyticsSummary(range) });
  const courses = useQuery({ queryKey: courseKeys.admin(), queryFn: listCourses, staleTime: 30_000 });
  const pendingOrders = useQuery({ queryKey: [...orderKeys.admin(), 'PENDING'], queryFn: () => listOrders('PENDING'), staleTime: 30_000 });
  const activity = useQuery({ queryKey: auditLogKeys.list({ limit: 6 }), queryFn: () => listAuditLogs({ limit: 6 }), staleTime: 30_000 });

  const learners = platform.data?.learners ?? 0;
  const instructors = platform.data?.instructors ?? 0;
  const publishedCourses = platform.data?.courses ?? 0;
  const platformMax = Math.max(learners, instructors, publishedCourses, 1);

  const revenueCents = summary.data?.totalRevenueCents ?? 0;
  const enrollments = summary.data?.totalEnrollments ?? 0;
  const certificates = summary.data?.totalCertificates ?? 0;
  const rating = summary.data?.averageRating ?? 0;
  const summaryMax = Math.max(enrollments, certificates, 1);

  const pendingApprovalCount = (courses.data ?? []).filter((c) => c.publishRequestedAt).length;
  const pendingOrderCount = pendingOrders.data?.length ?? 0;
  const activityRows = activity.data?.items ?? [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-foreground-subtle">{t('overview.greeting', { name: user.name.split(' ')[0] })}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{t('overview.title')}</h1>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('overview.subtitle')}</p>
        </div>
        <Link
          to="/analytics"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elevation-1 transition-[background-color,box-shadow,transform] hover:scale-[1.02] hover:bg-primary-hover hover:shadow-elevation-2"
        >
          <TrendingUp className="size-4" aria-hidden="true" />
          {t('overview.viewAnalytics')}
        </Link>
      </motion.header>

      {platform.isError || summary.isError ? (
        <motion.p variants={item} className="mt-4 text-sm text-error">
          {errorMessage(platform.error ?? summary.error, t)}
        </motion.p>
      ) : null}

      {/* Platform counts: learners, instructors, published courses — each its own card with its share of the largest. */}
      <div className="mt-8 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          tone="primary"
          label={t('overview.platform.learners')}
          value={learners}
          max={platformMax}
          loading={platform.isPending}
          loadingLabel={t('overview.platform.loading')}
          format={format}
        />
        <StatCard
          icon={GraduationCap}
          tone="secondary"
          label={t('overview.platform.instructors')}
          value={instructors}
          max={platformMax}
          loading={platform.isPending}
          loadingLabel={t('overview.platform.loading')}
          format={format}
        />
        <StatCard
          icon={BookOpen}
          tone="success"
          label={t('overview.platform.courses')}
          value={publishedCourses}
          max={platformMax}
          loading={platform.isPending}
          loadingLabel={t('overview.platform.loading')}
          format={format}
        />
        <StatCard
          icon={DollarSign}
          tone="warning"
          label={t('overview.revenue', { days: 30 })}
          value={revenueCents}
          max={Math.max(revenueCents, 1)}
          loading={summary.isPending}
          loadingLabel={t('overview.platform.loading')}
          format={format}
          formatValue={(v) => (v / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
        />
      </div>

      {/* 30-day snapshot: enrollments, certificates and average rating — the same figures Analytics tracks in depth. */}
      <div className="mt-5 grid auto-rows-fr gap-5 sm:grid-cols-3">
        <StatCard
          icon={TrendingUp}
          tone="primary"
          label={t('analytics.summary.enrollments')}
          value={enrollments}
          max={summaryMax}
          loading={summary.isPending}
          loadingLabel={t('overview.platform.loading')}
          format={format}
        />
        <StatCard
          icon={Award}
          tone="secondary"
          label={t('analytics.summary.certificates')}
          value={certificates}
          max={summaryMax}
          loading={summary.isPending}
          loadingLabel={t('overview.platform.loading')}
          format={format}
        />
        <StatCard
          icon={Star}
          tone="success"
          label={t('analytics.summary.rating')}
          value={rating}
          max={5}
          loading={summary.isPending}
          loadingLabel={t('overview.platform.loading')}
          format={format}
          formatValue={(v) => v.toFixed(1)}
        />
      </div>

      {/* What needs you specifically, plus your own access. */}
      <div className="mt-5 grid auto-rows-fr gap-5 lg:grid-cols-3">
        <ActionTile
          icon={Clock}
          title={t('overview.pendingApprovals.title')}
          count={pendingApprovalCount}
          loading={courses.isPending}
          body={t('overview.pendingApprovals.body', { count: pendingApprovalCount })}
          emptyBody={t('overview.pendingApprovals.empty')}
          to="/courses"
          cta={t('overview.pendingApprovals.cta')}
          format={format}
        />
        <ActionTile
          icon={ShoppingCart}
          title={t('overview.pendingOrders.title')}
          count={pendingOrderCount}
          loading={pendingOrders.isPending}
          body={t('overview.pendingOrders.body', { count: pendingOrderCount })}
          emptyBody={t('overview.pendingOrders.empty')}
          to="/orders"
          cta={t('overview.pendingOrders.cta')}
          format={format}
        />
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
      </div>

      {/* Recent activity: the newest few audit-log entries, same icon/label mapping as the full Audit Log page. */}
      <motion.section variants={item} className="mt-5 flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-elevation-1">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <ScrollText className="size-5" aria-hidden="true" />
            </span>
            <h2 className="text-sm font-semibold text-foreground">{t('overview.activity.title')}</h2>
          </div>
          <Link to="/audit-log" className="text-sm font-medium text-primary hover:underline">
            {t('overview.activity.viewAll')}
          </Link>
        </header>
        <div className="mt-5">
          {activity.isPending ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : activityRows.length === 0 ? (
            <p className="text-sm text-foreground-muted">{t('overview.activity.empty')}</p>
          ) : (
            <motion.ul variants={rows_} initial="hidden" animate="show" className="divide-y divide-border">
              {activityRows.map((entry) => {
                const Icon = ACTION_ICONS[entry.action.split('.')[0]] ?? ScrollText;
                return (
                  <motion.li key={entry.id} variants={row} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-foreground-muted">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">{translateOrRaw(t, `auditLog.actions.${entry.action}`, entry.action)}</p>
                    <span className="shrink-0 text-xs text-foreground-subtle">{format.relativeTime(new Date(entry.createdAt))}</span>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

/** Admins see platform-wide health and counts; instructors see only their own courses and students. */
export default function OverviewPage() {
  const user = useCurrentUser();
  const isAdmin = user.permissions.includes('courses.manage');
  return isAdmin ? <AdminOverview /> : <InstructorOverview />;
}
