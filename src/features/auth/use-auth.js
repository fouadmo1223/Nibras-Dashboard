import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys, isSessionQuery, getSession, login, logout } from '@/services/auth.service';
import { errorMessage } from '@/lib/api-errors';
import { toast } from '@/stores/toast-store';

export function useSession() {
  return useQuery({ queryKey: authKeys.session(), queryFn: getSession, staleTime: 5 * 60 * 1000, retry: false });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      queryClient.setQueryData(authKeys.session(), result.data);
      toast.success(result.message);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: (result) => toast.success(result.message),
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => {
      // Update the session in place (observers stay attached), then drop all other, private, data.
      queryClient.setQueryData(authKeys.session(), null);
      queryClient.removeQueries({ predicate: (q) => !isSessionQuery(q) });
    },
  });
}

/**
 * Permission check for UI decisions (show/hide/disable). Purely cosmetic —
 * the API enforces every permission on its own.
 */
export function usePermissions() {
  const { data } = useSession();
  const granted = new Set(data?.user.permissions ?? []);
  return {
    has: (permission) => granted.has(permission),
    hasAll: (...permissions) => permissions.every((p) => granted.has(p)),
  };
}

export const DASHBOARD_ACCESS = 'dashboard.access';
