import { Navigate, useLocation } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { CurrentUserContext } from './current-user';
import SessionLoading from './SessionLoading';
import SignOutButton from './SignOutButton';
import { DASHBOARD_ACCESS, useSession } from './use-auth';

function FullScreen({ children }) {
  return <main className="grid min-h-dvh place-items-center px-6">{children}</main>;
}

/**
 * Route guard: signed-in users with every required permission see `children`.
 * UX only — every API call is authorised server-side regardless.
 */
export default function RequireAuth({ permissions = [DASHBOARD_ACCESS], children }) {
  const { t, locale } = useI18n();
  const location = useLocation();
  const session = useSession();

  if (session.isPending) {
    return <SessionLoading label={t('auth.checking')} brandLabel={t('common.admin')} locale={locale} />;
  }

  if (session.isError) {
    return (
      <FullScreen>
        <Alert tone="error" title={errorMessage(session.error, t)} className="max-w-md" />
      </FullScreen>
    );
  }

  if (!session.data) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  const granted = new Set(session.data.user.permissions);
  if (!permissions.every((p) => granted.has(p))) {
    return (
      <FullScreen>
        <div className="max-w-sm text-center">
          <div className="relative mx-auto w-fit">
            <Avatar user={session.data.user} size="lg" />
            <span className="absolute -bottom-1 -end-1 grid size-7 place-items-center rounded-full border-2 border-background bg-warning-soft text-warning">
              <ShieldAlert className="size-4" aria-hidden="true" />
            </span>
          </div>
          <h1 className="mt-5 text-xl font-semibold text-foreground">{t('auth.noAccess.title')}</h1>
          <p className="mt-2 text-sm text-foreground-muted">{t('auth.noAccess.body', { email: session.data.user.email })}</p>
          <SignOutButton size="md" className="mt-6" label={t('auth.noAccess.switchAccount')} />
        </div>
      </FullScreen>
    );
  }

  // Children read the user from context, so they never observe the session turning null mid-sign-out.
  return <CurrentUserContext.Provider value={session.data.user}>{children}</CurrentUserContext.Provider>;
}
