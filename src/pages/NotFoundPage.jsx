import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <main className="grid min-h-[60dvh] flex-1 place-items-center px-6">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-5 font-mono text-sm text-foreground-subtle">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{t('errors.notFoundTitle')}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{t('errors.notFoundBody')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {t('common.backToOverview')}
        </Link>
      </div>
    </main>
  );
}
