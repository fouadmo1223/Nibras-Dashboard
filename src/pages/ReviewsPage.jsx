import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Search, Star, Trash2 } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Card from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Menu from '@/components/ui/Menu';
import Pagination from '@/components/ui/Pagination';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { courseKeys, listCourses } from '@/services/courses.service';
import { instructorKeys, listInstructors } from '@/services/instructors.service';
import { listReviews, removeReview, reviewKeys } from '@/services/reviews.service';
import { toast } from '@/stores/toast-store';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
const rows_ = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const row = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const LIMIT = 10;

function Stars({ value }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('size-3.5', n <= value ? 'fill-warning text-warning' : 'fill-transparent text-foreground-subtle')} />
      ))}
    </div>
  );
}

/** A filter dropdown built on the shared `Menu` component — same pattern as CoursesPage's. */
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

/** Admin review moderation: every review, platform-wide — filterable by rating/course/instructor/reviewer, paged, removable. */
export default function ReviewsPage() {
  const { t, format } = useI18n();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState('');
  const [courseId, setCourseId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState(null);

  // Debounce the reviewer search so every keystroke doesn't fire a request; also resets to
  // page 1, same as the other filters do directly in their own onChange below.
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [qInput]);

  const changeRating = (value) => {
    setRating(value);
    setPage(1);
  };
  const changeCourse = (value) => {
    setCourseId(value);
    setPage(1);
  };
  const changeInstructor = (value) => {
    setInstructorId(value);
    setPage(1);
  };

  const query = { rating: rating || undefined, courseId: courseId || undefined, instructorId: instructorId || undefined, q: q || undefined, page, limit: LIMIT };
  const reviews = useQuery({ queryKey: reviewKeys.admin(query), queryFn: () => listReviews(query) });
  const courses = useQuery({ queryKey: courseKeys.admin(), queryFn: listCourses });
  const instructors = useQuery({ queryKey: instructorKeys.admin(), queryFn: listInstructors });

  const remove = useMutation({
    mutationFn: (id) => removeReview(id),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      setRemoving(null);
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const rows = reviews.data?.items ?? [];
  const pagination = reviews.data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;
  const hasFilters = Boolean(rating || courseId || instructorId || q);

  const ratingOptions = [
    { value: '', label: t('common.all') },
    ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: t('reviews.filters.ratingOption', { rating: n }) })),
  ];
  const courseOptions = [{ value: '', label: t('common.all') }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.titleEn }))];
  const instructorOptions = [{ value: '', label: t('common.all') }, ...(instructors.data ?? []).map((i) => ({ value: i.id, label: i.user.name }))];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Star className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('reviews.title')}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-foreground-muted">{t('reviews.subtitle')}</p>
      </motion.header>

      <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-2">
        <FilterMenu label={t('reviews.filters.rating')} value={rating} options={ratingOptions} onChange={changeRating} />
        <FilterMenu label={t('reviews.filters.course')} value={courseId} options={courseOptions} onChange={changeCourse} />
        <FilterMenu label={t('reviews.filters.instructor')} value={instructorId} options={instructorOptions} onChange={changeInstructor} />
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t('reviews.filters.reviewer')}
            className="h-10 w-48 rounded-lg border border-border-strong bg-surface ps-10 pe-3 text-sm text-foreground placeholder:text-foreground-subtle outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card as="section" aria-labelledby="reviews-list" className="mt-6 overflow-hidden">
          <h2 id="reviews-list" className="sr-only">
            {t('reviews.title')}
          </h2>
          {reviews.isPending ? (
            <div className="space-y-3 p-6" aria-busy="true" aria-label={t('reviews.loading')}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : reviews.isError ? (
            <div className="p-6">
              <Alert tone="error" title={errorMessage(reviews.error, t)} />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
                <Star className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 text-base font-medium text-foreground">{hasFilters ? t('reviews.empty.filteredTitle') : t('reviews.empty.title')}</p>
              <p className="mt-1.5 max-w-sm text-sm text-foreground-muted">{hasFilters ? t('reviews.empty.filteredBody') : t('reviews.empty.body')}</p>
            </div>
          ) : (
            <motion.ul variants={rows_} initial="hidden" animate="show" className="divide-y divide-border">
              {rows.map((r) => (
                <motion.li key={r.id} variants={row} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-6 py-4 transition-colors hover:bg-surface-muted/50">
                  <div className="min-w-60 flex-1">
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} />
                      <span className="text-sm text-foreground-subtle">{format.date(r.createdAt, { dateStyle: 'medium' })}</span>
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">
                      <span className="font-medium text-foreground">{r.user.name}</span> {t('reviews.onCourse')} <span className="font-medium text-foreground">{r.course.titleEn}</span>
                      {r.course.instructor ? <span className="text-foreground-subtle"> · {r.course.instructor.user.name}</span> : null}
                    </p>
                    {r.comment ? <p className="mt-1.5 text-sm text-foreground">{r.comment}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoving(r)}
                    className="shrink-0 rounded-md p-2 text-foreground-subtle transition-colors hover:bg-error-soft hover:text-error"
                    aria-label={t('reviews.remove')}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </Card>
      </motion.div>

      <ConfirmDialog
        open={Boolean(removing)}
        icon={Trash2}
        tone="danger"
        title={t('reviews.removeConfirmTitle')}
        description={t('reviews.removeConfirmDescription')}
        confirmLabel={t('reviews.remove')}
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => remove.mutate(removing.id)}
      />
    </motion.div>
  );
}
