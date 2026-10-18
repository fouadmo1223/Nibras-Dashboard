import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Check, ClipboardList, X } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Menu from '@/components/ui/Menu';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { cancelOrder, listOrders, markOrderPaid, orderKeys } from '@/services/orders.service';
import { toast } from '@/stores/toast-store';
import { errorMessage } from '@/lib/api-errors';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
const rows_ = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const row = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const STATUS_TONE = {
  PENDING: 'bg-warning-soft text-warning',
  PAID: 'bg-success-soft text-success',
  CANCELLED: 'bg-error-soft text-error',
};

const formatPrice = (cents) => (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

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

/** Admin orders: every order placed from a cart, filterable by status, with mark-paid (auto-enrols) and cancel actions. */
export default function OrdersPage() {
  const { t, format } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const orders = useQuery({ queryKey: [...orderKeys.admin(), status], queryFn: () => listOrders(status || undefined) });

  const markPaid = useMutation({
    mutationFn: (id) => markOrderPaid(id),
    onSuccess: (result) => {
      toast.success(result.message);
      return queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const cancel = useMutation({
    mutationFn: (id) => cancelOrder(id),
    onSuccess: (result) => {
      toast.success(result.message);
      return queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  const rows = orders.data ?? [];
  const statusOptions = useMemo(
    () => [
      { value: '', label: t('orders.filters.all') },
      { value: 'PENDING', label: t('orders.status.PENDING') },
      { value: 'PAID', label: t('orders.status.PAID') },
      { value: 'CANCELLED', label: t('orders.status.CANCELLED') },
    ],
    [t],
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <ClipboardList className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('orders.title')}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-foreground-muted">{t('orders.subtitle')}</p>
      </motion.header>

      <motion.div variants={item} className="mt-6 flex flex-wrap gap-2">
        <FilterMenu label={t('orders.filters.status')} value={status} options={statusOptions} onChange={setStatus} />
      </motion.div>

      <motion.div variants={item}>
        <Card as="section" aria-labelledby="orders-list" className="mt-6 overflow-hidden">
          <h2 id="orders-list" className="sr-only">
            {t('orders.title')}
          </h2>
          {orders.isPending ? (
            <div className="space-y-3 p-6" aria-busy="true" aria-label={t('orders.loading')}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : orders.isError ? (
            <div className="p-6">
              <Alert tone="error" title={errorMessage(orders.error, t)} />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-20 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
                <ClipboardList className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 text-base font-medium text-foreground">{t('orders.empty.title')}</p>
              <p className="mt-1.5 max-w-sm text-sm text-foreground-muted">{t('orders.empty.body')}</p>
            </div>
          ) : (
            <motion.ul variants={rows_} initial="hidden" animate="show" className="divide-y divide-border">
              {rows.map((o) => (
                <motion.li key={o.id} variants={row} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
                  <div className="min-w-60 flex-1">
                    <p className="font-medium text-foreground">{o.user.name}</p>
                    <p className="mt-0.5 text-sm text-foreground-subtle">{o.user.email}</p>
                    <p className="mt-1 text-sm text-foreground-muted">{o.items.map((oi) => oi.courseTitleEn).join(', ')}</p>
                    <p className="mt-0.5 text-xs text-foreground-subtle">{format.date(o.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                  <div className="ms-auto flex shrink-0 flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{formatPrice(o.totalCents)}</span>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium', STATUS_TONE[o.status])}>
                      {t(`orders.status.${o.status}`)}
                    </span>
                    {o.status === 'PENDING' ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={markPaid.isPending && markPaid.variables === o.id}
                          onClick={() => markPaid.mutate(o.id)}
                          className="border-success/30 bg-success-soft text-success hover:bg-success hover:text-white"
                        >
                          <Check className="size-3.5" aria-hidden="true" />
                          {t('orders.actions.markPaid')}
                        </Button>
                        <Button variant="danger" size="sm" loading={cancel.isPending && cancel.variables === o.id} onClick={() => cancel.mutate(o.id)}>
                          <X className="size-3.5" aria-hidden="true" />
                          {t('orders.actions.cancel')}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
