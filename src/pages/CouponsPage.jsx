import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Check, DollarSign, Hash, Pencil, Percent, Plus, Ticket, X } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DatePicker from '@/components/ui/DatePicker';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { Segmented } from '@/features/preferences/PreferenceControls';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { couponKeys, createCoupon, listCoupons, updateCoupon } from '@/services/coupons.service';
import { toast } from '@/stores/toast-store';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
const rows_ = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const row = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const EMPTY_FORM = { code: '', type: 'PERCENT', value: '', maxRedemptions: '', expiresAt: '', isActive: true };

function formatValue(coupon, t) {
  return coupon.type === 'PERCENT' ? t('coupons.valuePercent', { value: coupon.value }) : t('coupons.valueFixed', { value: (coupon.value / 100).toFixed(2) });
}

/** PERCENT/FIXED, max-redemptions and expiry editor — a native <dialog>, same pattern as CoursesPage's ReasonDialog. */
function CouponDialog({ open, editing, onClose, onSubmit, loading }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const codeRef = useRef(null);
  const titleId = useId();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setForm(
        editing
          ? {
              code: editing.code,
              type: editing.type,
              value: String(editing.value),
              maxRedemptions: editing.maxRedemptions === null ? '' : String(editing.maxRedemptions),
              expiresAt: editing.expiresAt ? editing.expiresAt.slice(0, 10) : '',
              isActive: editing.isActive,
            }
          : EMPTY_FORM,
      );
      dialog.showModal();
      if (!editing) codeRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, editing]);

  const canSubmit = form.code.trim().length >= 3 && form.value !== '' && Number(form.value) > 0;

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
      <form
        className="p-6 sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <span className="mb-4 grid size-11 place-items-center rounded-full bg-primary-soft text-primary">
          <Ticket className="size-5" aria-hidden="true" />
        </span>
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {editing ? t('coupons.editTitle') : t('coupons.newTitle')}
        </h2>

        <div className="mt-5 space-y-4">
          <Field label={t('coupons.form.code')} hint={editing ? t('coupons.form.codeLocked') : t('coupons.form.codeHint')}>
            <div className="relative">
              <Hash className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
              <Input
                ref={codeRef}
                dir="ltr"
                placeholder="WELCOME10"
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="ps-10 font-mono tracking-wide"
              />
            </div>
          </Field>

          <Field label={t('coupons.form.type')}>
            <Segmented
              label={t('coupons.form.type')}
              value={form.type}
              onChange={(type) => setForm((f) => ({ ...f, type }))}
              className="w-full"
              options={[
                { id: 'PERCENT', label: t('coupons.type.PERCENT'), icon: Percent },
                { id: 'FIXED', label: t('coupons.type.FIXED'), icon: DollarSign },
              ]}
            />
          </Field>

          <Field label={form.type === 'PERCENT' ? t('coupons.form.valuePercent') : t('coupons.form.valueFixed')}>
            <div className="relative">
              {form.type === 'PERCENT' ? (
                <Percent className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
              ) : (
                <DollarSign className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
              )}
              <Input
                dir="ltr"
                type="number"
                min="1"
                max={form.type === 'PERCENT' ? '100' : undefined}
                step={form.type === 'PERCENT' ? '1' : '0.01'}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                className="ps-10"
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('coupons.form.maxRedemptions')} hint={t('coupons.form.maxRedemptionsHint')}>
              <Input
                dir="ltr"
                type="number"
                min="1"
                placeholder="∞"
                value={form.maxRedemptions}
                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
              />
            </Field>
            <Field label={t('coupons.form.expiresAt')} hint={t('coupons.form.expiresAtHint')}>
              <DatePicker
                value={form.expiresAt}
                onChange={(expiresAt) => setForm((f) => ({ ...f, expiresAt }))}
                placeholder={t('coupons.form.expiresAtPlaceholder')}
                label={t('coupons.form.expiresAt')}
              />
            </Field>
          </div>

          <label className="flex h-11 items-center gap-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            {t('coupons.form.isActive')}
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={!canSubmit}>
            {editing ? t('coupons.form.save') : t('coupons.form.submit')}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

/** Admin coupons: discount codes applied at order placement — create, edit, activate/deactivate. */
export default function CouponsPage() {
  const { t, format } = useI18n();
  const queryClient = useQueryClient();
  const coupons = useQuery({ queryKey: couponKeys.admin(), queryFn: listCoupons });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [now] = useState(() => Date.now());

  const refresh = () => queryClient.invalidateQueries({ queryKey: couponKeys.all });

  const create = useMutation({
    mutationFn: (body) => createCoupon(body),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      setDialogOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => updateCoupon(id, body),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
      setDialogOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => updateCoupon(id, { isActive }),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const rows = coupons.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (coupon) => {
    setEditing(coupon);
    setDialogOpen(true);
  };

  const handleSubmit = (form) => {
    const body = {
      type: form.type,
      value: form.type === 'PERCENT' ? Number(form.value) : Math.round(Number(form.value) * 100),
      maxRedemptions: form.maxRedemptions === '' ? null : Number(form.maxRedemptions),
      expiresAt: form.expiresAt === '' ? null : new Date(form.expiresAt).toISOString(),
      isActive: form.isActive,
    };
    if (editing) update.mutate({ id: editing.id, body });
    else create.mutate({ ...body, code: form.code.trim().toUpperCase() });
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Ticket className="size-5" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('coupons.title')}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('coupons.subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          {t('coupons.new')}
        </Button>
      </motion.header>

      <motion.div variants={item}>
        <Card as="section" aria-labelledby="coupons-list" className="mt-6 overflow-hidden">
          <h2 id="coupons-list" className="sr-only">
            {t('coupons.title')}
          </h2>
          {coupons.isPending ? (
            <div className="space-y-3 p-6" aria-busy="true" aria-label={t('coupons.loading')}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : coupons.isError ? (
            <div className="p-6">
              <Alert tone="error" title={errorMessage(coupons.error, t)} />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
                <Ticket className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 text-base font-medium text-foreground">{t('coupons.empty.title')}</p>
              <p className="mt-1.5 max-w-sm text-sm text-foreground-muted">{t('coupons.empty.body')}</p>
            </div>
          ) : (
            <motion.ul variants={rows_} initial="hidden" animate="show" className="divide-y divide-border">
              {rows.map((c) => {
                const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < now : false;
                const exhausted = c.maxRedemptions !== null && c.redemptionCount >= c.maxRedemptions;
                return (
                  <motion.li key={c.id} variants={row} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
                    <span
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-xl',
                        c.type === 'PERCENT' ? 'bg-primary-soft text-primary' : 'bg-secondary-soft text-secondary',
                      )}
                      aria-hidden="true"
                    >
                      {c.type === 'PERCENT' ? <Percent className="size-4.5" /> : <DollarSign className="size-4.5" />}
                    </span>
                    <div className="min-w-48 flex-1">
                      <p className="text-start font-mono font-medium tracking-wide text-foreground">
                        {c.code}
                      </p>
                      <p className="mt-0.5 text-sm text-foreground-subtle">
                        {formatValue(c, t)}
                        {' · '}
                        {t('coupons.redemptions', { count: c.redemptionCount, max: c.maxRedemptions ?? '∞' })}
                        {c.expiresAt ? ` · ${t('coupons.expiresOn', { date: format.date(c.expiresAt, { dateStyle: 'medium' }) })}` : ''}
                      </p>
                    </div>
                    <div className="ms-auto flex shrink-0 flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                          !c.isActive
                            ? 'bg-surface-muted text-foreground-muted'
                            : expired || exhausted
                              ? 'bg-warning-soft text-warning'
                              : 'bg-success-soft text-success',
                        )}
                      >
                        <span className={cn('size-1.5 rounded-full', !c.isActive ? 'bg-foreground-subtle' : expired || exhausted ? 'bg-warning' : 'bg-success')} aria-hidden="true" />
                        {!c.isActive ? t('coupons.status.inactive') : expired ? t('coupons.status.expired') : exhausted ? t('coupons.status.exhausted') : t('coupons.status.active')}
                      </span>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(c)}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                        {t('coupons.actions.edit')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={toggleActive.isPending && toggleActive.variables?.id === c.id}
                        onClick={() => toggleActive.mutate({ id: c.id, isActive: !c.isActive })}
                      >
                        {c.isActive ? <X className="size-3.5" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
                        {c.isActive ? t('coupons.actions.deactivate') : t('coupons.actions.activate')}
                      </Button>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </Card>
      </motion.div>

      <CouponDialog
        open={dialogOpen}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        loading={create.isPending || update.isPending}
      />
    </motion.div>
  );
}
