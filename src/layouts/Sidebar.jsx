import { NavLink } from 'react-router';
import { ChevronsLeft } from 'lucide-react';
import Logo, { LogoMark } from '@/components/ui/Logo';
import { useCurrentUser } from '@/features/auth/current-user';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { visibleNavGroups } from './navigation';

/** Grouped navigation links; `compact` shows icons only (labels stay available to assistive tech and as tooltips). */
export function SidebarNav({ compact = false, onNavigate }) {
  const { t } = useI18n();
  const user = useCurrentUser();
  return (
    <nav aria-label={t('nav.main')} className="flex-1 overflow-y-auto px-3 py-4">
      {visibleNavGroups(user.permissions).map((group) => (
        <div key={group.key} className="mb-5">
          <p
            className={cn(
              'mb-1.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-foreground-subtle transition-opacity duration-200',
              compact && 'sr-only',
            )}
          >
            {t(`nav.groups.${group.key}`)}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ key, to, icon: Icon, end }) => (
              <li key={key}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  title={compact ? t(`nav.${key}`) : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200',
                      compact && 'justify-center px-0',
                      isActive
                        ? 'bg-primary-soft text-primary shadow-elevation-1'
                        : 'text-foreground-muted hover:translate-x-0.5 hover:bg-surface-muted hover:text-foreground rtl:hover:-translate-x-0.5',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span aria-hidden="true" className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-gradient-to-b from-primary to-secondary" />}
                      <Icon className="size-[1.125rem] shrink-0" aria-hidden="true" />
                      <span className={cn('truncate', compact && 'sr-only')}>{t(`nav.${key}`)}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Desktop sidebar: expanded (labels) or compact (icons), animated between the two and pinned to the inline-start edge. */
export default function Sidebar({ compact, onToggle }) {
  const { t, locale } = useI18n();
  return (
    <aside
      className={cn(
        'fixed inset-y-0 start-0 z-30 hidden flex-col overflow-hidden border-e border-border bg-surface transition-[width] duration-300 ease-emphasized lg:flex',
        compact ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 start-1/2 -z-10 size-64 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--secondary)_16%,transparent),transparent)] blur-2xl" />
      <div className={cn('flex h-16 shrink-0 items-center border-b border-border', compact ? 'justify-center' : 'px-5')}>
        {compact ? <LogoMark className="size-8" /> : <Logo label={t('common.admin')} lang={locale} />}
      </div>
      <SidebarNav compact={compact} />
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={compact ? t('nav.expand') : t('nav.collapse')}
          title={`${compact ? t('nav.expand') : t('nav.collapse')} (Ctrl+B)`}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground',
            compact && 'justify-center px-0',
          )}
        >
          <ChevronsLeft className={cn('size-[1.125rem] shrink-0 transition-transform duration-300 rtl:-scale-x-100', compact && 'rotate-180')} aria-hidden="true" />
          <span className={cn(compact && 'sr-only')}>{compact ? t('nav.expand') : t('nav.collapse')}</span>
        </button>
      </div>
    </aside>
  );
}
