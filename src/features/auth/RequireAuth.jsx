import { Navigate, useLocation } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { errorMessage } from '@/lib/api-errors';
import { CurrentUserContext } from './current-user';
import { DASHBOARD_ACCESS, useLogout, useSession } from './use-auth';

function FullScreen({ children }) {
  return <main className="grid min-h-dvh place-items-center px-6">{children}</main>;
}

/**
 * Route guard: signed-in users with every required permission see `children`.
 * UX only — every API call is authorised server-side regardless.
 */
export default function RequireAuth({ permissions = [DASHBOARD_ACCESS], children }) {
  const location = useLocation();
  const session = useSession();
  const logout = useLogout();

  if (session.isPending) {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-4" aria-busy="true" aria-label="Checking your session">
          <Logo label="Admin" />
          <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </FullScreen>
    );
  }

  if (session.isError) {
    return (
      <FullScreen>
        <Alert tone="error" title={errorMessage(session.error)} className="max-w-md" />
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
          <h1 className="mt-5 text-xl font-semibold text-foreground">No access to the admin dashboard</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            You’re signed in as <strong className="text-foreground">{session.data.user.email}</strong>, which doesn’t have
            dashboard access. Ask an administrator if you think this is a mistake.
          </p>
          <Button variant="secondary" className="mt-6" loading={logout.isPending} onClick={() => logout.mutate()}>
            Sign in with another account
          </Button>
        </div>
      </FullScreen>
    );
  }

  // Children read the user from context, so they never observe the session turning null mid-sign-out.
  return <CurrentUserContext.Provider value={session.data.user}>{children}</CurrentUserContext.Provider>;
}
