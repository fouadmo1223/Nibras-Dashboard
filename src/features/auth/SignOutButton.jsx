import { useState } from 'react';
import { LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useLogout } from './use-auth';

/** Sign-out with a confirmation step; RequireAuth redirects to /login once the session is gone. */
export default function SignOutButton({ variant = 'secondary', size = 'sm', className, label = 'Sign out' }) {
  const logout = useLogout();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setConfirming(true)}>
        <LogOut className="size-4" aria-hidden="true" />
        {label}
      </Button>
      <ConfirmDialog
        open={confirming}
        icon={LogOut}
        tone="danger"
        title="Sign out of the dashboard?"
        description="You’ll need to sign in again to manage Nibras on this device."
        confirmLabel="Sign out"
        loading={logout.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => logout.mutate(undefined, { onSettled: () => setConfirming(false) })}
      />
    </>
  );
}
