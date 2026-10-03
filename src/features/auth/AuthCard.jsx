import Logo from '@/components/ui/Logo';
import { LanguageMenu, ThemeMenu } from '@/features/preferences/PreferenceControls';
import { useI18n } from '@/i18n/I18nProvider';
import AuthShowcase from './AuthShowcase';

/**
 * Dashboard sign-in layout: two halves on desktop (form + animated
 * illustration pinned in place), form only on smaller screens.
 */
export default function AuthCard({ title, subtitle, children, footer }) {
  const { t, locale } = useI18n();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative flex flex-col px-6 py-8 sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_35%_at_50%_0%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_70%)]"
        />
        <div className="relative flex items-center justify-between gap-4">
          <Logo label={t('common.admin')} lang={locale} />
          <div className="flex items-center gap-0.5">
            <LanguageMenu />
            <ThemeMenu />
          </div>
        </div>
        <main id="main" className="animate-fade-up relative mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-foreground-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-foreground-muted">{footer}</div>}
        </main>
      </div>

      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        <AuthShowcase />
      </div>
    </div>
  );
}
