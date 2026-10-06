import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { FolderTree, Globe, Plus } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { useI18n } from '@/i18n/I18nProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { categoryKeys, createCategory, listCategories, updateCategory } from '@/services/categories.service';
import { toast } from '@/stores/toast-store';
import { categorySchema } from './category-schema';

/** Admin categories: list in display order, create, and publish or unpublish. */
export default function CategoriesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const categories = useQuery({ queryKey: categoryKeys.admin(), queryFn: listCategories });
  const schema = useMemo(() => categorySchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { slug: '', nameEn: '', nameAr: '', descriptionEn: '', descriptionAr: '', isPublished: false },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  const create = useMutation({
    mutationFn: createCategory,
    onSuccess: (result) => {
      toast.success(result.message);
      reset();
      setOpen(false);
      return refresh();
    },
    onError: (error) => {
      if (error.code === 'SLUG_TAKEN') setError('slug', { type: 'server', message: error.message });
      else applyFieldErrors(error, setError, ['slug', 'nameEn', 'nameAr', 'descriptionEn', 'descriptionAr']);
    },
  });
  const publish = useMutation({
    mutationFn: ({ id, isPublished }) => updateCategory(id, { isPublished }),
    onSuccess: (result) => {
      toast.success(result.message);
      return refresh();
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const rows = categories.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('categories.title')}</h1>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('categories.subtitle')}</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Plus className="size-4" aria-hidden="true" />
          {t('categories.new')}
        </Button>
      </header>

      {open ? (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit((values) => create.mutate(values))}
          noValidate
          className="mt-6 grid gap-4 rounded-2xl border border-border bg-surface p-6 shadow-elevation-1 md:grid-cols-2"
        >
          {create.isError && !['SLUG_TAKEN', 'VALIDATION_ERROR'].includes(create.error.code) ? (
            <div className="md:col-span-2">
              <Alert tone="error" title={errorMessage(create.error, t)} />
            </div>
          ) : null}
          <Field label={t('categories.form.slug')} error={errors.slug?.message} hint={t('categories.form.slugHint')}>
            <Input dir="ltr" placeholder="web-development" {...register('slug')} />
          </Field>
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
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('categories.form.submit')}
            </Button>
          </div>
        </motion.form>
      ) : null}

      <section aria-labelledby="categories-list" className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-elevation-1">
        <h2 id="categories-list" className="sr-only">
          {t('categories.title')}
        </h2>
        {categories.isPending ? (
          <div className="space-y-3 p-6" aria-busy="true" aria-label={t('categories.loading')}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : categories.isError ? (
          <div className="p-6">
            <Alert tone="error" title={errorMessage(categories.error, t)} />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <FolderTree className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-medium text-foreground">{t('categories.empty.title')}</p>
            <p className="mt-1 max-w-sm text-sm text-foreground-muted">{t('categories.empty.body')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{c.nameEn}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-foreground-subtle">
                    <span dir="ltr" className="font-mono">
                      {c.slug}
                    </span>
                    <span dir="rtl">{c.nameAr}</span>
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                    c.isPublished ? 'bg-success-soft text-success' : 'bg-surface-muted text-foreground-muted',
                  )}
                >
                  <Globe className="size-3.5" aria-hidden="true" />
                  {c.isPublished ? t('categories.status.published') : t('categories.status.draft')}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={publish.isPending && publish.variables?.id === c.id}
                  onClick={() => publish.mutate({ id: c.id, isPublished: !c.isPublished })}
                >
                  {c.isPublished ? t('categories.actions.unpublish') : t('categories.actions.publish')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
