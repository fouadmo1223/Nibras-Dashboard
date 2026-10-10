import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ChevronRight, FolderTree, Globe, Plus } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { categoryKeys, listCategories, updateCategory } from '@/services/categories.service';
import { toast } from '@/stores/toast-store';

/** Admin categories: list in display order; create/edit live on their own pages. */
export default function CategoriesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: categoryKeys.admin(), queryFn: listCategories });

  const publish = useMutation({
    mutationFn: ({ id, isPublished }) => updateCategory(id, { isPublished }),
    onSuccess: (result) => {
      toast.success(result.message);
      return queryClient.invalidateQueries({ queryKey: categoryKeys.all });
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
        <Button as={Link} to="/categories/new">
          <Plus className="size-4" aria-hidden="true" />
          {t('categories.new')}
        </Button>
      </header>

      <Card as="section" aria-labelledby="categories-list" className="mt-8 overflow-hidden">
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
            <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
              <FolderTree className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-medium text-foreground">{t('categories.empty.title')}</p>
            <p className="mt-1 max-w-sm text-sm text-foreground-muted">{t('categories.empty.body')}</p>
            <Button as={Link} to="/categories/new" className="mt-6">
              <Plus className="size-4" aria-hidden="true" />
              {t('categories.new')}
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
                className="group flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 transition-colors duration-200 hover:bg-surface-muted"
              >
                <Link to={`/categories/${c.id}`} className="flex min-w-60 flex-1 items-center gap-4">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-muted text-foreground-subtle">
                      <FolderTree className="size-5" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground group-hover:text-primary">{c.nameEn}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-foreground-subtle">
                      <span dir="ltr" className="font-mono">
                        {c.slug}
                      </span>
                      <span dir="rtl">{c.nameAr}</span>
                    </p>
                  </div>
                </Link>
                <div className="ms-auto flex shrink-0 items-center gap-4">
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
                  <Link
                    to={`/categories/${c.id}`}
                    aria-label={t('categories.edit')}
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-foreground-subtle transition-colors hover:bg-surface hover:text-foreground"
                  >
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
