import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Lock, Pencil, Plus, Shield, Trash2, Users, X } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Field from '@/components/ui/Field';
import Input, { inputClassName } from '@/components/ui/Input';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { createRole, deleteRole, listPermissions, listRoles, roleKeys, updateRole } from '@/services/roles.service';
import { toast } from '@/stores/toast-store';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
const rows_ = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const row = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const EMPTY_FORM = { key: '', name: '', description: '', permissions: [] };

/** Create/edit dialog — the role key field only shows (and is only editable) when creating. */
function RoleDialog({ open, editing, permissions, onClose, onSubmit, loading }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const nameRef = useRef(null);
  const titleId = useId();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setForm(
        editing
          ? { key: editing.key, name: editing.name, description: editing.description ?? '', permissions: editing.permissions }
          : EMPTY_FORM,
      );
      dialog.showModal();
      nameRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, editing]);

  const togglePermission = (key) => {
    setForm((f) => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key] }));
  };

  const groups = useMemo(() => {
    const byGroup = new Map();
    for (const p of permissions) {
      if (!byGroup.has(p.group)) byGroup.set(p.group, []);
      byGroup.get(p.group).push(p);
    }
    return Array.from(byGroup, ([group, items]) => ({ group, items }));
  }, [permissions]);

  const canSubmit = form.name.trim().length >= 2 && (editing || /^[A-Z][A-Z0-9_]{1,49}$/.test(form.key));

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
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border bg-surface-raised p-0 text-foreground shadow-elevation-3 backdrop:bg-black/55 backdrop:backdrop-blur-sm open:animate-dialog-in"
    >
      <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {editing ? t('roles.form.editTitle') : t('roles.form.createTitle')}
          </h2>
          <button type="button" onClick={onClose} disabled={loading} className="rounded-lg p-1.5 text-foreground-subtle transition-colors hover:bg-surface-muted hover:text-foreground">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {!editing ? (
            <Field label={t('roles.form.key')} hint={t('roles.form.keyHint')}>
              <Input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                placeholder="TEACHING_ASSISTANT"
                className="font-mono tracking-wide"
              />
            </Field>
          ) : null}
          <Field label={t('roles.form.name')}>
            <Input ref={nameRef} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label={t('roles.form.description')}>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className={cn(inputClassName, 'h-auto py-2.5')}
            />
          </Field>

          <div>
            <p className="text-sm font-medium text-foreground">{t('roles.form.permissions')}</p>
            <div className="mt-2 max-h-64 space-y-4 overflow-y-auto rounded-lg border border-border p-3">
              {groups.map(({ group, items }) => (
                <div key={group}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle">{group}</p>
                  <div className="mt-1.5 space-y-1.5">
                    {items.map((p) => (
                      <label key={p.key} className="flex items-start gap-2.5 text-sm text-foreground">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-primary"
                          checked={form.permissions.includes(p.key)}
                          onChange={() => togglePermission(p.key)}
                        />
                        <span>
                          <span className="font-mono text-xs text-foreground-subtle">{p.key}</span>
                          <span className="block text-foreground-muted">{p.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => onSubmit(form)} loading={loading} disabled={!canSubmit}>
            {editing ? t('common.save') : t('roles.form.create')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/** Admin role & permission management: view the system roles, create/edit/delete custom ones. */
export default function RolesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const roles = useQuery({ queryKey: roleKeys.admin(), queryFn: listRoles });
  const permissions = useQuery({ queryKey: roleKeys.permissions(), queryFn: listPermissions });
  const rows = roles.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: roleKeys.all });

  const create = useMutation({
    mutationFn: (body) => createRole(body),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      setDialogOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });
  const update = useMutation({
    mutationFn: ({ id, body }) => updateRole(id, body),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      setDialogOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });
  const remove = useMutation({
    mutationFn: (id) => deleteRole(id),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      setRemoving(null);
    },
    onError: (error) => {
      toast.error(errorMessage(error, t));
      setRemoving(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (role) => {
    setEditing(role);
    setDialogOpen(true);
  };
  const onSubmit = (form) => {
    if (editing) update.mutate({ id: editing.id, body: { name: form.name, description: form.description || undefined, permissions: form.permissions } });
    else create.mutate({ key: form.key, name: form.name, description: form.description || undefined, permissions: form.permissions });
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Shield className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('roles.title')}</h1>
            <p className="mt-1 max-w-2xl text-foreground-muted">{t('roles.subtitle')}</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          {t('roles.new')}
        </Button>
      </motion.header>

      <motion.div variants={item}>
        <Card as="section" className="mt-6 overflow-hidden">
          {roles.isPending ? (
            <div className="space-y-3 p-6" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : roles.isError ? (
            <div className="p-6">
              <Alert tone="error" title={errorMessage(roles.error, t)} />
            </div>
          ) : (
            <motion.ul variants={rows_} initial="hidden" animate="show" className="divide-y divide-border">
              {rows.map((r) => (
                <motion.li key={r.id} variants={row} className="flex flex-wrap items-start gap-x-4 gap-y-3 px-6 py-4">
                  <div className="min-w-60 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{r.name}</p>
                      <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground-subtle">{r.key}</span>
                      {r.isSystem ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-secondary-soft px-1.5 py-0.5 text-[11px] font-medium text-secondary">
                          <Lock className="size-3" aria-hidden="true" />
                          {t('roles.system')}
                        </span>
                      ) : null}
                    </div>
                    {r.description ? <p className="mt-1 text-sm text-foreground-muted">{r.description}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.permissions.length === 0 ? (
                        <span className="text-xs text-foreground-subtle">{t('roles.noPermissions')}</span>
                      ) : (
                        r.permissions.map((p) => (
                          <span key={p} className="rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground-subtle">
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="ms-auto flex shrink-0 items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground-subtle">
                      <Users className="size-3.5" aria-hidden="true" />
                      {t('roles.userCount', { count: r.userCount })}
                    </span>
                    {!r.isSystem ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          aria-label={t('common.edit')}
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground-subtle transition-colors hover:bg-surface-muted hover:text-foreground"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoving(r)}
                          aria-label={t('common.delete')}
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-foreground-subtle transition-colors hover:bg-error-soft hover:text-error"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </Card>
      </motion.div>

      <RoleDialog
        open={dialogOpen}
        editing={editing}
        permissions={permissions.data ?? []}
        onClose={() => setDialogOpen(false)}
        onSubmit={onSubmit}
        loading={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        icon={Trash2}
        tone="danger"
        title={removing ? t('roles.removeConfirmTitle', { name: removing.name }) : ''}
        description={t('roles.removeConfirmDescription')}
        confirmLabel={t('common.delete')}
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => remove.mutate(removing.id)}
      />
    </motion.div>
  );
}
