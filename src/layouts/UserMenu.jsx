import { useNavigate } from 'react-router';
import { LogOut, Settings } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Menu from '@/components/ui/Menu';
import { useCurrentUser } from '@/features/auth/current-user';
import { useI18n } from '@/i18n/I18nProvider';

/** Avatar menu: who is signed in, their roles, settings and sign out. */
export default function UserMenu({ onSignOut }) {
  const { t } = useI18n();
  const user = useCurrentUser();
  const navigate = useNavigate();
  return (
    <Menu
      label={t('user.menu')}
      triggerClassName="inline-flex rounded-full ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-border-strong aria-expanded:ring-2 aria-expanded:ring-primary"
      triggerContent={<Avatar user={user} size="sm" className="size-9" />}
      menuClassName="w-72"
      header={
        <div className="mb-1 flex items-center gap-3 border-b border-border px-3 pb-3 pt-2">
          <Avatar user={user} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-foreground-subtle">
              <span className="sr-only">{t('user.signedInAs')} </span>
              {user.email}
            </p>
            <p className="mt-1 truncate text-xs text-foreground-muted">{user.roles.map((role) => t(`roles.${role}`)).join(' · ')}</p>
          </div>
        </div>
      }
      items={[
        { id: 'settings', label: t('user.settings'), icon: Settings, onSelect: () => navigate('/settings') },
        { id: 'sign-out', label: t('signOut.button'), icon: LogOut, onSelect: onSignOut },
      ]}
    />
  );
}
