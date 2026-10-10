import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { BookOpen, ChevronLeft, ChevronRight, ImagePlus, Trash2, Upload } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useI18n } from '@/i18n/I18nProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { categoryKeys, listCategories } from '@/services/categories.service';
import {
  addCourseGalleryImage,
  courseKeys,
  createCourse,
  getCourse,
  removeCourseGalleryImage,
  reorderCourseGalleryImages,
  updateCourse,
  uploadCourseImage,
} from '@/services/courses.service';
import { instructorKeys, listInstructors } from '@/services/instructors.service';
import { toast } from '@/stores/toast-store';
import { COURSE_LEVELS, courseSchema } from './course-schema';

const textareaClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
    control,
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
      compareAtPrice: '',
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
        compareAtPrice: detail.data.compareAtPriceCents ? detail.data.compareAtPriceCents / 100 : '',
        categoryId: detail.data.category.id,
        instructorId: detail.data.instructor.id,
        isPublished: detail.data.isPublished,
      });
    }
  }, [detail.data, reset]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: courseKeys.all });
  const save = useMutation({
    mutationFn: (values) => {
      const { price, compareAtPrice, slug, ...rest } = values;
      const body = {
        ...rest,
        imageUrl: values.imageUrl || undefined,
        priceCents: Math.round(price * 100),
        compareAtPriceCents: compareAtPrice ? Math.round(compareAtPrice * 100) : null,
      };
      // The slug is immutable after creation — UpdateCourseDto doesn't accept it at all.
      return editing ? updateCourse(id, body) : createCourse({ slug, ...body });
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

  const addGalleryImage = useMutation({
    mutationFn: (file) => addCourseGalleryImage(id, file),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(id) });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const removeGalleryImage = useMutation({
    mutationFn: (imageId) => removeCourseGalleryImage(id, imageId),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(id) });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const reorderGallery = useMutation({
    mutationFn: (imageIds) => reorderCourseGalleryImages(id, imageIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.detail(id) }),
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const galleryFileInputRef = useRef(null);
  const handleGalleryFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) addGalleryImage.mutate(file);
  };
  const moveGalleryImage = (index, direction) => {
    const images = detail.data?.images ?? [];
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const ids = images.map((img) => img.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderGallery.mutate(ids);
  };

  const loadingRefs = categories.isPending || instructors.isPending;

  if (editing && (detail.isPending || loadingRefs)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-9 w-48 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-8 h-96 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }

  if (editing && detail.isError) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Alert tone="error" title={errorMessage(detail.error, t)} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
          <Select
            control={control}
            name="categoryId"
            label={t('courses.form.category')}
            placeholder={t('courses.form.selectOption')}
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.nameEn }))}
          />
        </Field>
        <Field label={t('courses.form.instructor')} error={errors.instructorId?.message}>
          <Select
            control={control}
            name="instructorId"
            label={t('courses.form.instructor')}
            placeholder={t('courses.form.selectOption')}
            options={(instructors.data ?? []).map((i) => ({ value: i.id, label: i.user.name }))}
          />
        </Field>

        <Field label={t('courses.form.level')} error={errors.level?.message}>
          <Select
            control={control}
            name="level"
            label={t('courses.form.level')}
            options={COURSE_LEVELS.map((level) => ({ value: level, label: t(`courses.level.${level}`) }))}
          />
        </Field>
        <Field label={t('courses.form.price')} error={errors.price?.message} hint={t('courses.form.priceHint')}>
          <Input dir="ltr" type="number" min="0" step="0.01" {...register('price')} />
        </Field>
        <Field label={t('courses.form.compareAtPrice')} error={errors.compareAtPrice?.message} hint={t('courses.form.compareAtPriceHint')}>
          <Input dir="ltr" type="number" min="0" step="0.01" placeholder={t('courses.form.compareAtPricePlaceholder')} {...register('compareAtPrice')} />
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

        {editing ? (
          <Field label={t('courses.form.gallery')} hint={t('courses.form.galleryHint')} className="md:col-span-2">
            <div className="flex flex-wrap gap-4">
              {(detail.data.images ?? []).map((image, index) => (
                <div key={image.id} className="group relative size-28 shrink-0 overflow-hidden rounded-lg border border-border">
                  <img src={image.imageUrl} alt="" className="size-full object-cover" />
                  <div className="absolute inset-0 flex flex-col items-center justify-between bg-black/0 p-1.5 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100 focus-within:bg-black/40 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => removeGalleryImage.mutate(image.id)}
                      aria-label={t('courses.form.galleryRemove')}
                      className="self-end rounded-md bg-black/60 p-1.5 text-white hover:bg-error"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveGalleryImage(index, -1)}
                        disabled={index === 0}
                        aria-label={t('courses.form.galleryMoveEarlier')}
                        className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ChevronLeft className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveGalleryImage(index, 1)}
                        disabled={index === (detail.data.images?.length ?? 0) - 1}
                        aria-label={t('courses.form.galleryMoveLater')}
                        className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div>
                <input
                  ref={galleryFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
                  className="sr-only"
                  onChange={handleGalleryFileChange}
                />
                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  disabled={addGalleryImage.isPending}
                  className="grid size-28 shrink-0 place-items-center rounded-lg border border-dashed border-border-strong text-foreground-subtle transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-60"
                >
                  {addGalleryImage.isPending ? (
                    <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="size-5" aria-hidden="true" />
                  )}
                  <span className="sr-only">{t('courses.form.galleryAdd')}</span>
                </button>
              </div>
            </div>
          </Field>
        ) : null}

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
