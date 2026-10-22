import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Search, ShieldCheck, Users as UsersIcon, UserX, X } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import { inputClassName } from '@/components/ui/Input';
import Menu from '@/components/ui/Menu';
import { useCurrentUser } from '@/features/auth/current-user';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { adminUserKeys, listUsers, setUserStatus, updateUserRoles } from '@/services/admin-users.service';
import { listRoles, roleKeys } from '@/services/roles.service';
import { toast } from '@/stores/toast-store';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
const rows_ = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const row = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const LIMIT = 10;
const SYSTEM_ROLE_KEYS = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR', 'STUDENT'];

function FilterMenu({ label, value, options, onChange }) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  return (
    <Menu
      label={label}
      align="start"
      items={options.map((option) => ({ id: option.value || 'all', label: option.label, selected: option.value === value, onSelect: () => onChange(option.value) }))}
      triggerContent={
        <>
          <span className="text-foreground-subtle">{label}:</span>
          <span className="font-medium text-foreground">{selected.label}</span>
        </>
      }
      triggerClassName="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3.5 text-sm transition-colors hover:bg-surface-muted"
    />
  );
}

/** Replaces a user's complete role set — a checkbox per known role. */
function RolesDialog({ user, roles, onClose, onSubmit, loading }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const titleId = useId();
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (user && !dialog.open) {
      setSelected(user.roleIds ?? []);
      dialog.showModal();
    } else if (!user && dialog.open) {
      dialog.close();
    }
  }, [user]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !loading) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-surface-raised p-0 text-foreground shadow-elevation-3 backdrop:bg-black/55 backdrop:backdrop-blur-sm open:animate-dialog-in"
    >
      {user ? (
        <div className="p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {t('users.rolesDialog.title', { name: user.name })}
            </h2>
            <button type="button" onClick={onClose} disabled={loading} className="rounded-lg p-1.5 text-foreground-subtle transition-colors hover:bg-surface-muted hover:text-foreground">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground">
                <input type="checkbox" className="size-4 accent-primary" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                <span className="flex-1">{r.name}</span>
                <span className="font-mono text-[11px] text-foreground-subtle">{r.key}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => onSubmit(selected)} loading={loading} disabled={selected.length === 0}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/** Collects a required reason before suspending an account. */
function SuspendDialog({ user, onClose, onConfirm, loading }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const textareaRef = useRef(null);
  const titleId = useId();
  const [reason, setReason] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (user && !dialog.open) {
      setReason('');
      dialog.showModal();
      textareaRef.current?.focus();
    } else if (!user && dialog.open) {
      dialog.close();
    }
  }, [user]);

  const canConfirm = reason.trim().length >= 10;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !loading) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface-raised p-0 text-foreground shadow-elevation-3 backdrop:bg-black/55 backdrop:backdrop-blur-sm open:animate-dialog-in"
    >
      {user ? (
        <div className="p-6 sm:p-7">
          <span className="mb-4 grid size-11 place-items-center rounded-full bg-error-soft text-error">
            <UserX className="size-5" aria-hidden="true" />
          </span>
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {t('users.suspendDialog.title', { name: user.name })}
          </h2>
          <p className="mt-1.5 text-sm text-foreground-muted">{t('users.suspendDialog.body')}</p>
          <Field label={t('users.suspendDialog.reasonLabel')} className="mt-4">
            <textarea
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={t('users.suspendDialog.reasonPlaceholder')}
              className={cn(inputClassName, 'h-auto py-2.5')}
            />
          </Field>
          <div className="mt-6 flex justify-end gap-2.5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="danger" onClick={() => onConfirm(reason)} loading={loading} disabled={!canConfirm}>
              {t('users.suspend')}
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

/** Admin user management: search/filter, suspend/reactivate, and assign roles. */
export default function UsersPage() {
  const { t } = useI18n();
  const me = useCurrentUser();
  const queryClient = useQueryClient();

  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState(null);
  const [suspending, setSuspending] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [qInput]);

  const changeRole = (value) => {
    setRoleId(value);
    setPage(1);
  };
  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const query = { q: q || undefined, roleId: roleId || undefined, status: status || undefined, page, limit: LIMIT };
  const users = useQuery({ queryKey: adminUserKeys.list(query), queryFn: () => listUsers(query) });
  const roles = useQuery({ queryKey: roleKeys.admin(), queryFn: listRoles });

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, body }) => setUserStatus(id, body),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      setSuspending(null);
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });
  const rolesMutation = useMutation({
    mutationFn: ({ id, roleIds }) => updateUserRoles(id, roleIds),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      setAssigning(null);
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const rows = users.data?.items ?? [];
  const pagination = users.data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;
  const roleOptions = [{ value: '', label: t('common.all') }, ...(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))];
  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'ACTIVE', label: t('users.status.ACTIVE') },
    { value: 'SUSPENDED', label: t('users.status.SUSPENDED') },
  ];
  const rolesById = new Map((roles.data ?? []).map((r) => [r.id, r]));
  /** The 4 seeded system roles have their own translations; a custom role's own name has no key to look up. */
  const roleLabel = (key) => (SYSTEM_ROLE_KEYS.includes(key) ? t(`roles.${key}`) : key);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <UsersIcon className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('users.title')}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-foreground-muted">{t('users.subtitle')}</p>
      </motion.header>

      <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-2">
        <FilterMenu label={t('users.filters.role')} value={roleId} options={roleOptions} onChange={changeRole} />
        <FilterMenu label={t('users.filters.status')} value={status} options={statusOptions} onChange={changeStatus} />
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t('users.filters.search')}
            className="h-10 w-56 rounded-lg border border-border-strong bg-surface ps-10 pe-3 text-sm text-foreground placeholder:text-foreground-subtle outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card as="section" className="mt-6 overflow-hidden">
          {users.isPending ? (
            <div className="space-y-3 p-6" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : users.isError ? (
            <div className="p-6">
              <Alert tone="error" title={errorMessage(users.error, t)} />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
                <UsersIcon className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-4 font-medium text-foreground">{t('users.empty.title')}</p>
            </div>
          ) : (
            <motion.ul variants={rows_} initial="hidden" animate="show" className="divide-y divide-border">
              {rows.map((u) => (
                <motion.li key={u.id} variants={row} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
                  <div className="flex min-w-60 flex-1 items-center gap-3">
                    <Avatar user={u} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{u.name}</p>
                      <p className="truncate text-sm text-foreground-subtle">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles.map((key) => (
                      <span key={key} className="inline-flex items-center gap-1 rounded-md bg-secondary-soft px-2 py-0.5 text-xs font-medium text-secondary">
                        {key === 'SUPER_ADMIN' ? <ShieldCheck className="size-3" aria-hidden="true" /> : null}
                        {roleLabel(key)}
                      </span>
                    ))}
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                      u.status === 'SUSPENDED' ? 'bg-error-soft text-error' : 'bg-success-soft text-success',
                    )}
                  >
                    <span className={cn('size-1.5 rounded-full', u.status === 'SUSPENDED' ? 'bg-error' : 'bg-success')} aria-hidden="true" />
                    {t(`users.status.${u.status}`)}
                  </span>
                  <div className="ms-auto flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setAssigning({ id: u.id, name: u.name, roleIds: u.roles.map((key) => [...rolesById.values()].find((r) => r.key === key)?.id).filter(Boolean) })}
                      disabled={u.id === me.id}
                    >
                      {t('users.manageRoles')}
                    </Button>
                    {u.status === 'SUSPENDED' ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={changeStatusMutation.isPending && changeStatusMutation.variables?.id === u.id}
                        onClick={() => changeStatusMutation.mutate({ id: u.id, body: { status: 'ACTIVE' } })}
                        disabled={u.id === me.id}
                      >
                        {t('users.reactivate')}
                      </Button>
                    ) : (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setSuspending(u)} disabled={u.id === me.id}>
                        {t('users.suspend')}
                      </Button>
                    )}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}

          {pagination && totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                {t('reviews.pagination.previous')}
              </button>
              <span className="text-sm text-foreground-subtle">{t('reviews.pagination.status', { page, totalPages })}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40"
              >
                {t('reviews.pagination.next')}
                <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </Card>
      </motion.div>

      <RolesDialog
        user={assigning}
        roles={roles.data ?? []}
        onClose={() => setAssigning(null)}
        onSubmit={(roleIds) => rolesMutation.mutate({ id: assigning.id, roleIds })}
        loading={rolesMutation.isPending}
      />
      <SuspendDialog
        user={suspending}
        onClose={() => setSuspending(null)}
        onConfirm={(reason) => changeStatusMutation.mutate({ id: suspending.id, body: { status: 'SUSPENDED', reason } })}
        loading={changeStatusMutation.isPending}
      />
    </motion.div>
  );
}
