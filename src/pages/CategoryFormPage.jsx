import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { FolderTree, Upload } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { useI18n } from '@/i18n/I18nProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { categoryKeys, createCategory, getCategory, updateCategory, uploadCategoryImage } from '@/services/categories.service';
import { toast } from '@/stores/toast-store';
import { categorySchema } from './category-schema';

/** Create or edit a category (`/categories/new` or `/categories/:id`). */
export default function CategoryFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schema = useMemo(() => categorySchema(t), [t]);

  const detail = useQuery({ queryKey: categoryKeys.detail(id), queryFn: () => getCategory(id), enabled: editing });

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
    defaultValues: { slug: '', nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', imageUrl: '', isPublished: false },
  });

  const imageUrl = watch('imageUrl');

  useEffect(() => {
    if (detail.data) {
      reset({
        slug: detail.data.slug,
        nameEn: detail.data.nameEn,
        nameAr: detail.data.nameAr,
        descriptionEn: detail.data.descriptionEn ?? '',
        descriptionAr: detail.data.descriptionAr ?? '',
        imageUrl: detail.data.imageUrl ?? '',
        isPublished: detail.data.isPublished,
      });
    }
  }, [detail.data, reset]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  const save = useMutation({
    mutationFn: (values) => {
      const body = { ...values, imageUrl: values.imageUrl || undefined };
      return editing ? updateCategory(id, body) : createCategory(body);
    },
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      navigate('/categories');
    },
    onError: (error) => {
      if (error.code === 'SLUG_TAKEN') setError('slug', { type: 'server', message: error.message });
      else applyFieldErrors(error, setError, ['slug', 'nameEn', 'nameAr', 'descriptionEn', 'descriptionAr', 'imageUrl']);
    },
  });

  const upload = useMutation({
    mutationFn: (file) => uploadCategoryImage(id, file),
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

  if (editing && detail.isPending) {
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
          <FolderTree className="size-5" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{editing ? t('categories.edit') : t('categories.new')}</h1>
      </div>

      <Card as="form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="mt-8 grid gap-5 p-6 md:grid-cols-2">
        {save.isError && !['SLUG_TAKEN', 'VALIDATION_ERROR'].includes(save.error.code) ? (
          <div className="md:col-span-2">
            <Alert tone="error" title={errorMessage(save.error, t)} />
          </div>
        ) : null}

        {editing ? (
          <Field label={t('categories.form.slug')} hint={t('categories.form.slugLocked')}>
            <Input dir="ltr" value={detail.data.slug} disabled />
          </Field>
        ) : (
          <Field label={t('categories.form.slug')} error={errors.slug?.message} hint={t('categories.form.slugHint')}>
            <Input dir="ltr" placeholder="web-development" {...register('slug')} />
          </Field>
        )}

        <Field label={t('categories.form.isPublished')}>
          <label className="flex h-11 items-center gap-2.5 text-sm text-foreground">
            <input type="checkbox" className="size-4 accent-primary" {...register('isPublished')} />
            {t('categories.form.publishNow')}
          </label>
        </Field>

        <Field label={t('categories.form.nameEn')} error={errors.nameEn?.message}>
          <Input dir="ltr" {...register('nameEn')} />
        </Field>
        <Field label={t('categories.form.nameAr')} error={errors.nameAr?.message}>
          <Input dir="rtl" {...register('nameAr')} />
        </Field>

        <Field label={t('categories.form.descriptionEn')} error={errors.descriptionEn?.message}>
          <textarea
            dir="ltr"
            rows={3}
            {...register('descriptionEn')}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
        <Field label={t('categories.form.descriptionAr')} error={errors.descriptionAr?.message}>
          <textarea
            dir="rtl"
            rows={3}
            {...register('descriptionAr')}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        <Field
          label={t('categories.form.imageUrl')}
          error={errors.imageUrl?.message}
          hint={editing ? t('categories.form.imageUrlHint') : t('categories.form.imageUploadHintNew')}
          className="md:col-span-2"
        >
          <div className="flex flex-wrap items-start gap-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-16 w-28 shrink-0 rounded-lg border border-border object-cover"
              />
            ) : null}
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
                    {t('categories.form.uploadImage')}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </Field>

        <div className="flex justify-end gap-3 md:col-span-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/categories')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending} disabled={editing && !isDirty}>
            {editing ? t('categories.form.save') : t('categories.form.submit')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
