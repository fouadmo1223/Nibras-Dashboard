import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { BookOpen, Check, ChevronRight, Clock, Globe, Trash2, X } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Menu from '@/components/ui/Menu';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { categoryKeys, listCategories } from '@/services/categories.service';
import { approveCoursePublish, courseKeys, listCourses, rejectCoursePublish, removeCourse } from '@/services/courses.service';
import { instructorKeys, listInstructors } from '@/services/instructors.service';
import { toast } from '@/stores/toast-store';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
const rows_ = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const row = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const formatPrice = (cents) => (cents === 0 ? null : (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' }));
const EMPTY = [];

/** A single filter dropdown built on the shared `Menu` component (no react-hook-form involved — plain state). */
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

/** Shared reason-collecting dialog for both "remove a course" and "reject a publish request". */
function ReasonDialog({ course, copy, icon: Icon, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');
  const ref = useRef(null);
  const textareaRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (course && !dialog.open) {
      setReason('');
      dialog.showModal();
      textareaRef.current?.focus();
    } else if (!course && dialog.open) {
      dialog.close();
    }
  }, [course]);

  const canConfirm = reason.trim().length >= 10;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !loading) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface-raised p-0 text-foreground shadow-elevation-3 backdrop:bg-black/55 backdrop:backdrop-blur-sm open:animate-dialog-in"
    >
      {course ? (
        <div className="p-6 sm:p-7">
          <span className="mb-4 grid size-11 place-items-center rounded-full bg-error-soft text-error">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {copy.title(course.titleEn)}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-foreground-muted">{copy.body}</p>
          <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="reason-dialog-textarea">
            {copy.reasonLabel}
          </label>
          <textarea
            ref={textareaRef}
            id="reason-dialog-textarea"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={copy.reasonPlaceholder}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              {copy.cancel}
            </Button>
            <Button
              onClick={() => onConfirm(reason.trim())}
              loading={loading}
              disabled={!canConfirm}
              className="bg-error text-white shadow-none hover:bg-error/90"
            >
              {copy.confirm}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/** Admin courses: view any course across the catalog, filter it, and remove one with a reason — editing stays with its instructor. */
export default function CoursesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const courses = useQuery({ queryKey: courseKeys.admin(), queryFn: listCourses });
  const categories = useQuery({ queryKey: categoryKeys.admin(), queryFn: listCategories });
  const instructors = useQuery({ queryKey: instructorKeys.admin(), queryFn: listInstructors });

  const [categoryId, setCategoryId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [price, setPrice] = useState('');
  const [level, setLevel] = useState('');
  const [removing, setRemoving] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const remove = useMutation({
    mutationFn: ({ id, reason }) => removeCourse(id, reason),
    onSuccess: (result) => {
      toast.success(result.message);
      setRemoving(null);
      return queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const approve = useMutation({
    mutationFn: (id) => approveCoursePublish(id),
    onSuccess: (result) => {
      toast.success(result.message);
      return queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }) => rejectCoursePublish(id, reason),
    onSuccess: (result) => {
      toast.success(result.message);
      setRejecting(null);
      return queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const allRows = courses.data ?? EMPTY;
  const rows = useMemo(
    () =>
      allRows.filter(
        (c) =>
          (!categoryId || c.category.id === categoryId) &&
          (!instructorId || c.instructor.id === instructorId) &&
          (!price || (price === 'free' ? c.priceCents === 0 : c.priceCents > 0)) &&
          (!level || c.level === level),
      ),
    [allRows, categoryId, instructorId, price, level],
  );
  const publishedCount = rows.filter((c) => c.isPublished).length;

  const categoryOptions = [{ value: '', label: t('courses.filters.all') }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.nameEn }))];
  const instructorOptions = [{ value: '', label: t('courses.filters.all') }, ...(instructors.data ?? []).map((i) => ({ value: i.id, label: i.user.name }))];
  const priceOptions = [
    { value: '', label: t('courses.filters.all') },
    { value: 'free', label: t('courses.filters.free') },
    { value: 'paid', label: t('courses.filters.paid') },
  ];
  const levelOptions = [
    { value: '', label: t('courses.filters.all') },
    { value: 'BEGINNER', label: t('courses.level.BEGINNER') },
    { value: 'INTERMEDIATE', label: t('courses.level.INTERMEDIATE') },
    { value: 'ADVANCED', label: t('courses.level.ADVANCED') },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('courses.title')}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-foreground-muted">{t('courses.subtitle')}</p>
        {!courses.isPending && !courses.isError && allRows.length > 0 ? (
          <p className="mt-2 text-sm text-foreground-subtle">{t('courses.summary', { count: rows.length, published: publishedCount })}</p>
        ) : null}
      </motion.header>

      {!courses.isPending && !courses.isError && allRows.length > 0 ? (
        <motion.div variants={item} className="mt-6 flex flex-wrap gap-2">
          <FilterMenu label={t('courses.filters.category')} value={categoryId} options={categoryOptions} onChange={setCategoryId} />
          <FilterMenu label={t('courses.filters.instructor')} value={instructorId} options={instructorOptions} onChange={setInstructorId} />
          <FilterMenu label={t('courses.filters.price')} value={price} options={priceOptions} onChange={setPrice} />
          <FilterMenu label={t('courses.filters.level')} value={level} options={levelOptions} onChange={setLevel} />
        </motion.div>
      ) : null}

      <motion.div variants={item}>
        <Card as="section" aria-labelledby="courses-list" className="mt-6 overflow-hidden">
          <h2 id="courses-list" className="sr-only">
            {t('courses.title')}
          </h2>
          {courses.isPending ? (
            <div className="space-y-3 p-6" aria-busy="true" aria-label={t('courses.loading')}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : courses.isError ? (
            <div className="p-6">
              <Alert tone="error" title={errorMessage(courses.error, t)} />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
                <BookOpen className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 text-base font-medium text-foreground">{t('courses.empty.title')}</p>
              <p className="mt-1.5 max-w-sm text-sm text-foreground-muted">{t('courses.empty.body')}</p>
            </div>
          ) : (
            <motion.ul variants={rows_} initial="hidden" animate="show" className="divide-y divide-border">
              {rows.map((c) => (
                <motion.li
                  key={c.id}
                  variants={row}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 transition-colors duration-200 hover:bg-surface-muted"
                >
                  <Link to={`/courses/${c.id}`} aria-label={t('courses.view')} className="flex min-w-60 flex-1 items-center gap-4">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover shadow-elevation-1" />
                    ) : (
                      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface-muted text-foreground-subtle">
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
                  <div className="ms-auto flex shrink-0 flex-wrap items-center gap-2">
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
                    {c.publishRequestedAt ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={approve.isPending && approve.variables === c.id}
                          onClick={() => approve.mutate(c.id)}
                          className="border-success/30 bg-success-soft text-success hover:bg-success hover:text-white"
                        >
                          <Check className="size-3.5" aria-hidden="true" />
                          {t('courses.actions.approve')}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setRejecting(c)}>
                          <X className="size-3.5" aria-hidden="true" />
                          {t('courses.actions.reject')}
                        </Button>
                      </>
                    ) : null}
                    <Button variant="danger" size="sm" onClick={() => setRemoving(c)}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      {t('courses.actions.remove')}
                    </Button>
                    <Link
                      to={`/courses/${c.id}`}
                      aria-label={t('courses.view')}
                      className="grid size-11 shrink-0 place-items-center rounded-lg text-foreground-subtle transition-colors hover:bg-surface hover:text-foreground"
                    >
                      <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </Card>
      </motion.div>

      <ReasonDialog
        course={removing}
        icon={Trash2}
        copy={{
          title: (name) => t('courses.removeDialog.title', { name }),
          body: t('courses.removeDialog.body'),
          reasonLabel: t('courses.removeDialog.reasonLabel'),
          reasonPlaceholder: t('courses.removeDialog.reasonPlaceholder'),
          cancel: t('courses.removeDialog.cancel'),
          confirm: t('courses.removeDialog.confirm'),
        }}
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={(reason) => remove.mutate({ id: removing.id, reason })}
      />
      <ReasonDialog
        course={rejecting}
        icon={X}
        copy={{
          title: (name) => t('courses.rejectDialog.title', { name }),
          body: t('courses.rejectDialog.body'),
          reasonLabel: t('courses.rejectDialog.reasonLabel'),
          reasonPlaceholder: t('courses.rejectDialog.reasonPlaceholder'),
          cancel: t('courses.rejectDialog.cancel'),
          confirm: t('courses.rejectDialog.confirm'),
        }}
        loading={reject.isPending}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) => reject.mutate({ id: rejecting.id, reason })}
      />
    </motion.div>
  );
}
