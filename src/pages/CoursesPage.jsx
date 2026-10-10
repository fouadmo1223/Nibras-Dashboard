import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { BookOpen, ChevronRight, Globe, Plus } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { courseKeys, listCourses, updateCourse } from '@/services/courses.service';
import { toast } from '@/stores/toast-store';

const formatPrice = (cents) => (cents === 0 ? null : (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' }));

/** Admin courses: list in display order; create/edit live on their own pages. */
export default function CoursesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const courses = useQuery({ queryKey: courseKeys.admin(), queryFn: listCourses });

  const publish = useMutation({
    mutationFn: ({ id, isPublished }) => updateCourse(id, { isPublished }),
    onSuccess: (result) => {
      toast.success(result.message);
      return queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const rows = courses.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('courses.title')}</h1>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('courses.subtitle')}</p>
        </div>
        <Button as={Link} to="/courses/new">
          <Plus className="size-4" aria-hidden="true" />
          {t('courses.new')}
        </Button>
      </header>

      <Card as="section" aria-labelledby="courses-list" className="mt-8 overflow-hidden">
        <h2 id="courses-list" className="sr-only">
          {t('courses.title')}
        </h2>
        {courses.isPending ? (
          <div className="space-y-3 p-6" aria-busy="true" aria-label={t('courses.loading')}>
            {[0, 1, 2].map((i) => (
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
            <p className="mt-4 font-medium text-foreground">{t('courses.empty.title')}</p>
            <p className="mt-1 max-w-sm text-sm text-foreground-muted">{t('courses.empty.body')}</p>
            <Button as={Link} to="/courses/new" className="mt-6">
              <Plus className="size-4" aria-hidden="true" />
              {t('courses.new')}
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group flex flex-wrap items-center gap-4 px-6 py-4 transition-colors duration-200 hover:bg-surface-muted"
              >
                <Link to={`/courses/${c.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-muted text-foreground-subtle">
                      <BookOpen className="size-5" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground group-hover:text-primary">{c.titleEn}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-foreground-subtle">
                      <span>{c.category.nameEn}</span>
                      <span>{c.instructor.user.name}</span>
                      {formatPrice(c.priceCents) ? <span>{formatPrice(c.priceCents)}</span> : <span>{t('courses.free')}</span>}
                    </p>
                  </div>
                </Link>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                    c.isPublished ? 'bg-success-soft text-success' : 'bg-surface-muted text-foreground-muted',
                  )}
                >
                  <Globe className="size-3.5" aria-hidden="true" />
                  {c.isPublished ? t('courses.status.published') : t('courses.status.draft')}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={publish.isPending && publish.variables?.id === c.id}
                  onClick={() => publish.mutate({ id: c.id, isPublished: !c.isPublished })}
                >
                  {c.isPublished ? t('courses.actions.unpublish') : t('courses.actions.publish')}
                </Button>
                <Link
                  to={`/courses/${c.id}`}
                  aria-label={t('courses.edit')}
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-foreground-subtle transition-colors hover:bg-surface hover:text-foreground"
                >
                  <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
