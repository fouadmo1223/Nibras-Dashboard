import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { TriangleAlert } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

/** Branded fallback for errors thrown while rendering or loading a route. */
export default function RouteErrorPage() {
  const { t } = useI18n();
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-error-soft text-error">
          <TriangleAlert className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-foreground">{notFound ? t('errors.notFoundTitle') : t('errors.crashTitle')}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{notFound ? t('errors.notFoundBody') : t('errors.crashBody')}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            {t('common.reload')}
          </button>
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-md border border-border-strong px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            {t('common.backToOverview')}
          </Link>
        </div>
        {import.meta.env.DEV && error instanceof Error && (
          <pre dir="ltr" className="mt-6 overflow-auto rounded-md bg-surface-muted p-3 text-start text-xs text-foreground-muted">{error.stack}</pre>
        )}
      </div>
    </main>
  );
}
