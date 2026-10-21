import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { BookOpen, ChevronRight, Clock, Globe, Pencil, Plus, Star, X } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { acknowledgeCourseRemoval, courseKeys, listMyCourseRemovals, listMyCourses } from '@/services/courses.service';
import { toast } from '@/stores/toast-store';

/** Removal notices for the signed-in instructor's courses — a reason an admin gave when deleting one of their courses. */
function RemovalNotices() {
  const { t, format } = useI18n();
  const queryClient = useQueryClient();
  const removals = useQuery({ queryKey: courseKeys.removals(), queryFn: listMyCourseRemovals });
  const acknowledge = useMutation({
    mutationFn: (id) => acknowledgeCourseRemoval(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.removals() }),
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const unacknowledged = (removals.data ?? []).filter((r) => !r.acknowledgedAt);
  if (unacknowledged.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{t('myCourses.removals.title')}</h2>
      {unacknowledged.map((r) => (
        <Alert key={r.id} tone="error" title={r.courseTitleEn}>
          <p>{r.reason}</p>
          <p className="mt-1 text-xs text-foreground-subtle">{format.date(r.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            loading={acknowledge.isPending && acknowledge.variables === r.id}
            onClick={() => acknowledge.mutate(r.id)}
          >
            <X className="size-3.5" aria-hidden="true" />
            {t('myCourses.removals.dismiss')}
          </Button>
        </Alert>
      ))}
    </div>
  );
}

/** An instructor's own courses — create, edit and publish them, manage curriculum and quizzes. */
export default function MyCoursesPage() {
  const { t } = useI18n();
  const courses = useQuery({ queryKey: courseKeys.mine(), queryFn: listMyCourses });
  const rows = courses.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('myCourses.title')}</h1>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('myCourses.subtitle')}</p>
        </div>
        <Button as={Link} to="/my-courses/new">
          <Plus className="size-4" aria-hidden="true" />
          {t('courses.new')}
        </Button>
      </header>

      <RemovalNotices />

      <Card as="section" aria-labelledby="my-courses-list" className="mt-8 overflow-hidden">
        <h2 id="my-courses-list" className="sr-only">
          {t('myCourses.title')}
        </h2>
        {courses.isPending ? (
          <div className="space-y-3 p-6" aria-busy="true" aria-label={t('courses.loading')}>
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : courses.isError ? (
          <div className="p-6">
            <Alert tone="error" title={errorMessage(courses.error, t)} />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
              <BookOpen className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-medium text-foreground">{t('myCourses.empty.title')}</p>
            <p className="mt-1 max-w-sm text-sm text-foreground-muted">{t('myCourses.empty.body')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 transition-colors duration-200 hover:bg-surface-muted"
              >
                <Link to={`/my-courses/${c.id}`} className="flex min-w-60 flex-1 items-center gap-4">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-muted text-foreground-subtle">
                      <BookOpen className="size-5" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground group-hover:text-primary">{c.titleEn}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground-subtle">
                      <span>{c.category.nameEn}</span>
                      {c.reviewCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden="true">·</span>
                          <Star className="size-3.5 fill-warning text-warning" aria-hidden="true" />
                          <span className="font-medium text-foreground">{c.averageRating.toFixed(1)}</span>
                          <span>{t('myCourses.reviewCount', { count: c.reviewCount })}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden="true">·</span>
                          {t('myCourses.noReviews')}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
                <div className="ms-auto flex shrink-0 items-center gap-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                      c.publishRequestedAt
                        ? 'bg-warning-soft text-warning'
                        : c.isPublished
                          ? 'bg-success-soft text-success'
                          : 'bg-surface-muted text-foreground-muted',
                    )}
                  >
                    {c.publishRequestedAt ? <Clock className="size-3.5" aria-hidden="true" /> : <Globe className="size-3.5" aria-hidden="true" />}
                    {c.publishRequestedAt
                      ? t('courses.status.pending')
                      : c.isPublished
                        ? t('courses.status.published')
                        : t('courses.status.draft')}
                  </span>
                  <Link
                    to={`/my-courses/${c.id}`}
                    aria-label={t('myCourses.editDetails')}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground-subtle transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to={`/my-courses/${c.id}/curriculum`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                  >
                    {t('myCourses.editCurriculum')}
                    <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                  </Link>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
