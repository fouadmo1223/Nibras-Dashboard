import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { BookOpen, Upload } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { useI18n } from '@/i18n/I18nProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { categoryKeys, listCategories } from '@/services/categories.service';
import { courseKeys, createCourse, getCourse, updateCourse, uploadCourseImage } from '@/services/courses.service';
import { instructorKeys, listInstructors } from '@/services/instructors.service';
import { toast } from '@/stores/toast-store';
import { COURSE_LEVELS, courseSchema } from './course-schema';

const textareaClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
const selectClass =
  'h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Create or edit a course (`/courses/new` or `/courses/:id`). */
export default function CourseFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schema = useMemo(() => courseSchema(t), [t]);

  const detail = useQuery({ queryKey: courseKeys.detail(id), queryFn: () => getCourse(id), enabled: editing });
  const categories = useQuery({ queryKey: categoryKeys.admin(), queryFn: listCategories });
  const instructors = useQuery({ queryKey: instructorKeys.admin(), queryFn: listInstructors });

  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: '',
      titleEn: '',
      titleAr: '',
      subtitleEn: '',
      subtitleAr: '',
      descriptionEn: '',
      descriptionAr: '',
      imageUrl: '',
      level: 'BEGINNER',
      price: 0,
      categoryId: '',
      instructorId: '',
      isPublished: false,
    },
  });

  const imageUrl = watch('imageUrl');

  useEffect(() => {
    if (detail.data) {
      reset({
        slug: detail.data.slug,
        titleEn: detail.data.titleEn,
        titleAr: detail.data.titleAr,
        subtitleEn: detail.data.subtitleEn ?? '',
        subtitleAr: detail.data.subtitleAr ?? '',
        descriptionEn: detail.data.descriptionEn ?? '',
        descriptionAr: detail.data.descriptionAr ?? '',
        imageUrl: detail.data.imageUrl ?? '',
        level: detail.data.level,
        price: detail.data.priceCents / 100,
        categoryId: detail.data.category.id,
        instructorId: detail.data.instructor.id,
        isPublished: detail.data.isPublished,
      });
    }
  }, [detail.data, reset]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: courseKeys.all });
  const save = useMutation({
    mutationFn: (values) => {
      const { price, ...rest } = values;
      const body = { ...rest, imageUrl: values.imageUrl || undefined, priceCents: Math.round(price * 100) };
      return editing ? updateCourse(id, body) : createCourse(body);
    },
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      navigate('/courses');
    },
    onError: (error) => {
      if (error.code === 'SLUG_TAKEN') setError('slug', { type: 'server', message: error.message });
      else if (error.code === 'CATEGORY_NOT_FOUND') setError('categoryId', { type: 'server', message: error.message });
      else if (error.code === 'INSTRUCTOR_NOT_FOUND') setError('instructorId', { type: 'server', message: error.message });
      else applyFieldErrors(error, setError, ['slug', 'titleEn', 'titleAr', 'subtitleEn', 'subtitleAr', 'descriptionEn', 'descriptionAr', 'imageUrl']);
    },
  });

  const upload = useMutation({
    mutationFn: (file) => uploadCourseImage(id, file),
    onSuccess: (result) => {
      toast.success(result.message);
      setValue('imageUrl', result.data.imageUrl, { shouldDirty: false });
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) upload.mutate(file);
  };

  const loadingRefs = categories.isPending || instructors.isPending;

  if (editing && (detail.isPending || loadingRefs)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-9 w-48 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  if (editing && detail.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Alert tone="error" title={errorMessage(detail.error, t)} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <BookOpen className="size-5" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{editing ? t('courses.edit') : t('courses.new')}</h1>
      </div>

      <Card as="form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="mt-8 grid gap-5 p-6 md:grid-cols-2">
        {save.isError && !['SLUG_TAKEN', 'CATEGORY_NOT_FOUND', 'INSTRUCTOR_NOT_FOUND', 'VALIDATION_ERROR'].includes(save.error.code) ? (
          <div className="md:col-span-2">
            <Alert tone="error" title={errorMessage(save.error, t)} />
          </div>
        ) : null}

        {editing ? (
          <Field label={t('courses.form.slug')} hint={t('courses.form.slugLocked')}>
            <Input dir="ltr" value={detail.data.slug} disabled />
          </Field>
        ) : (
          <Field label={t('courses.form.slug')} error={errors.slug?.message} hint={t('courses.form.slugHint')}>
            <Input dir="ltr" placeholder="complete-web-development" {...register('slug')} />
          </Field>
        )}

        <Field label={t('courses.form.isPublished')}>
          <label className="flex h-11 items-center gap-2.5 text-sm text-foreground">
            <input type="checkbox" className="size-4 accent-primary" {...register('isPublished')} />
            {t('courses.form.publishNow')}
          </label>
        </Field>

        <Field label={t('courses.form.titleEn')} error={errors.titleEn?.message}>
          <Input dir="ltr" {...register('titleEn')} />
        </Field>
        <Field label={t('courses.form.titleAr')} error={errors.titleAr?.message}>
          <Input dir="rtl" {...register('titleAr')} />
        </Field>

        <Field label={t('courses.form.subtitleEn')} error={errors.subtitleEn?.message}>
          <Input dir="ltr" {...register('subtitleEn')} />
        </Field>
        <Field label={t('courses.form.subtitleAr')} error={errors.subtitleAr?.message}>
          <Input dir="rtl" {...register('subtitleAr')} />
        </Field>

        <Field label={t('courses.form.descriptionEn')} error={errors.descriptionEn?.message}>
          <textarea dir="ltr" rows={3} {...register('descriptionEn')} className={textareaClass} />
        </Field>
        <Field label={t('courses.form.descriptionAr')} error={errors.descriptionAr?.message}>
          <textarea dir="rtl" rows={3} {...register('descriptionAr')} className={textareaClass} />
        </Field>

        <Field label={t('courses.form.category')} error={errors.categoryId?.message}>
          <select className={selectClass} {...register('categoryId')}>
            <option value="">{t('courses.form.selectOption')}</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('courses.form.instructor')} error={errors.instructorId?.message}>
          <select className={selectClass} {...register('instructorId')}>
            <option value="">{t('courses.form.selectOption')}</option>
            {(instructors.data ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.user.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('courses.form.level')} error={errors.level?.message}>
          <select className={selectClass} {...register('level')}>
            {COURSE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`courses.level.${level}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('courses.form.price')} error={errors.price?.message} hint={t('courses.form.priceHint')}>
          <Input dir="ltr" type="number" min="0" step="0.01" {...register('price')} />
        </Field>

        <Field
          label={t('courses.form.imageUrl')}
          error={errors.imageUrl?.message}
          hint={editing ? t('courses.form.imageUrlHint') : t('courses.form.imageUploadHintNew')}
          className="md:col-span-2"
        >
          <div className="flex flex-wrap items-start gap-4">
            {imageUrl ? <img src={imageUrl} alt="" className="h-16 w-28 shrink-0 rounded-lg border border-border object-cover" /> : null}
            <div className="min-w-0 flex-1 space-y-2">
              <Input dir="ltr" placeholder="https://…" {...register('imageUrl')} />
              {editing ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                  <Button type="button" variant="secondary" loading={upload.isPending} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="size-4" aria-hidden="true" />
                    {t('courses.form.uploadImage')}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </Field>

        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/courses')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending} disabled={editing && !isDirty}>
            {editing ? t('courses.form.save') : t('courses.form.submit')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
