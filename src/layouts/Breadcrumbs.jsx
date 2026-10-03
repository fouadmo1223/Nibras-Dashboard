import { Link, useMatches } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

/** Built from route `handle.crumb` message keys; the last crumb is the current page. */
export default function Breadcrumbs() {
  const { t } = useI18n();
  const crumbs = useMatches()
    .filter((match) => match.handle?.crumb)
    .map((match) => ({ id: match.id, label: t(match.handle.crumb), to: match.pathname }));
  const trail = [{ id: 'root', label: t('nav.dashboard'), to: '/' }, ...crumbs];

  return (
    <nav aria-label={t('nav.breadcrumb')} className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={crumb.id} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-foreground-subtle rtl:-scale-x-100" aria-hidden="true" />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to} className="truncate text-foreground-muted transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
