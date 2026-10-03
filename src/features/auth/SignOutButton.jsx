import { useState } from 'react';
import { LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useI18n } from '@/i18n/I18nProvider';
import { useLogout } from './use-auth';

/** Sign-out confirmation; RequireAuth redirects to /login once the session is gone. */
export function SignOutDialog({ open, onClose }) {
  const { t } = useI18n();
  const logout = useLogout();
  return (
    <ConfirmDialog
      open={open}
      icon={LogOut}
      tone="danger"
      title={t('signOut.title')}
      description={t('signOut.description')}
      confirmLabel={t('signOut.confirm')}
      loading={logout.isPending}
      onCancel={onClose}
      onConfirm={() => logout.mutate(undefined, { onSettled: onClose })}
    />
  );
}

export default function SignOutButton({ variant = 'secondary', size = 'sm', className, label }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setConfirming(true)}>
        <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        {label ?? t('signOut.button')}
      </Button>
      <SignOutDialog open={confirming} onClose={() => setConfirming(false)} />
    </>
  );
}
