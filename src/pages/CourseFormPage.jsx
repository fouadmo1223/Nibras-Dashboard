import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Images,
  Layers,
  SlidersHorizontal,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import Alert from '@/components/ui/Alert';
import BilingualField from '@/components/ui/BilingualField';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import FormSection from '@/components/ui/FormSection';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useCurrentUser } from '@/features/auth/current-user';
import { useI18n } from '@/i18n/I18nProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { categoryKeys, listPublicCategories } from '@/services/categories.service';
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
import { toast } from '@/stores/toast-store';
import { COURSE_LEVELS, courseSchema } from './course-schema';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

/** Create or edit a course (`/my-courses/new` or `/my-courses/:id`) — an admin opening `/courses/:id` gets the same page read-only. */
export default function CourseFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const readOnly = editing && user.permissions.includes('courses.manage');
  const schema = useMemo(() => courseSchema(t), [t]);

  const detail = useQuery({ queryKey: courseKeys.detail(id), queryFn: () => getCourse(id), enabled: editing });
  const categories = useQuery({ queryKey: categoryKeys.public(), queryFn: listPublicCategories });

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
      navigate('/my-courses');
    },
    onError: (error) => {
      if (error.code === 'SLUG_TAKEN') setError('slug', { type: 'server', message: error.message });
      else if (error.code === 'CATEGORY_NOT_FOUND') setError('categoryId', { type: 'server', message: error.message });
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

  if (editing && (detail.isPending || categories.isPending)) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{readOnly ? t('courses.view') : editing ? t('courses.edit') : t('courses.new')}</h1>
        </div>
        {editing && !readOnly ? (
          <Button type="button" variant="secondary" onClick={() => navigate(`/my-courses/${id}/curriculum`)}>
            <Layers className="size-4" aria-hidden="true" />
            {t('curriculum.title')}
          </Button>
        ) : null}
      </div>

      <motion.form
        variants={container}
        initial="hidden"
        animate="show"
        onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit((values) => save.mutate(values))}
        noValidate
        className="mt-8"
      >
        <fieldset disabled={readOnly} className="space-y-5">
          {save.isError && !['SLUG_TAKEN', 'CATEGORY_NOT_FOUND', 'INSTRUCTOR_NOT_FOUND', 'VALIDATION_ERROR'].includes(save.error.code) ? (
            <motion.div variants={item}>
              <Alert tone="error" title={errorMessage(save.error, t)} />
            </motion.div>
          ) : null}

          {editing && detail.data.publishRequestedAt ? (
            <motion.div variants={item}>
              <Alert tone="info" title={t('courses.approval.pendingNotice')} />
            </motion.div>
          ) : editing && detail.data.publishRejectedReason ? (
            <motion.div variants={item}>
              <Alert tone="error" title={t('courses.approval.rejectedNotice')}>
                {detail.data.publishRejectedReason}
              </Alert>
            </motion.div>
          ) : null}

          <FormSection icon={SlidersHorizontal} title={t('courses.form.sections.basics')} description={t('courses.form.sections.basicsHint')}>
            {editing ? (
              <Field label={t('courses.form.slug')} hint={t('courses.form.slugLocked')}>
                <Input dir="ltr" value={detail.data.slug} disabled />
              </Field>
            ) : (
              <Field label={t('courses.form.slug')} error={errors.slug?.message} hint={t('courses.form.slugHint')}>
                <Input dir="ltr" placeholder="complete-web-development" {...register('slug')} />
              </Field>
            )}

            <Field label={t('courses.form.isPublished')} hint={t('courses.form.publishNowHint')}>
              <label className="flex h-11 items-center gap-2.5 text-sm text-foreground">
                <input type="checkbox" className="size-4 accent-primary" {...register('isPublished')} />
                {t('courses.form.publishNow')}
              </label>
            </Field>
          </FormSection>

          <FormSection icon={FileText} title={t('courses.form.sections.content')} description={t('courses.form.sections.contentHint')}>
            <div className="md:col-span-2">
              <BilingualField label={t('courses.form.title')} nameEn="titleEn" nameAr="titleAr" register={register} errors={errors} required />
            </div>
            <div className="md:col-span-2">
              <BilingualField label={t('courses.form.subtitle')} nameEn="subtitleEn" nameAr="subtitleAr" register={register} errors={errors} />
            </div>
            <div className="md:col-span-2">
              <BilingualField
                label={t('courses.form.description')}
                nameEn="descriptionEn"
                nameAr="descriptionAr"
                register={register}
                errors={errors}
                multiline
              />
            </div>
          </FormSection>

          <FormSection icon={Tag} title={t('courses.form.sections.categoryLevel')} bodyClassName="md:grid-cols-2">
            <Field label={t('courses.form.category')} error={errors.categoryId?.message}>
              <Select
                control={control}
                name="categoryId"
                label={t('courses.form.category')}
                placeholder={t('courses.form.selectOption')}
                options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.nameEn }))}
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
          </FormSection>

          <FormSection icon={DollarSign} title={t('courses.form.sections.pricing')} description={t('courses.form.sections.pricingHint')}>
            <Field label={t('courses.form.price')} error={errors.price?.message} hint={t('courses.form.priceHint')}>
              <Input dir="ltr" type="number" min="0" step="0.01" {...register('price')} />
            </Field>
            <Field label={t('courses.form.compareAtPrice')} error={errors.compareAtPrice?.message} hint={t('courses.form.compareAtPriceHint')}>
              <Input dir="ltr" type="number" min="0" step="0.01" placeholder={t('courses.form.compareAtPricePlaceholder')} {...register('compareAtPrice')} />
            </Field>
          </FormSection>

          <FormSection icon={ImageIcon} title={t('courses.form.sections.media')} description={t('courses.form.sections.mediaHint')} bodyClassName="md:grid-cols-1">
            <Field
              label={t('courses.form.imageUrl')}
              error={errors.imageUrl?.message}
              hint={editing ? t('courses.form.imageUrlHint') : t('courses.form.imageUploadHintNew')}
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
          </FormSection>

          {editing ? (
            <FormSection icon={Images} title={t('courses.form.sections.gallery')} description={t('courses.form.galleryHint')} bodyClassName="md:grid-cols-1">
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
            </FormSection>
          ) : null}
        </fieldset>

        <motion.div variants={item} className="mt-5 flex justify-end gap-3">
          {readOnly ? (
            <Button type="button" variant="secondary" onClick={() => navigate('/courses')}>
              {t('common.cancel')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => navigate('/my-courses')}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={save.isPending} disabled={editing && !isDirty}>
                {editing ? t('courses.form.save') : t('courses.form.submit')}
              </Button>
            </>
          )}
        </motion.div>
      </motion.form>
    </div>
  );
}
