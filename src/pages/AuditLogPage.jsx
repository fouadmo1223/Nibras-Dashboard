import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ScrollText, Search } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Card from '@/components/ui/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { auditLogKeys, listAuditLogs } from '@/services/audit-logs.service';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };
const rows_ = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const row = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const LIMIT = 20;

/** Admin, read-only audit trail: every recorded action, newest first, filterable by action prefix. */
export default function AuditLogPage() {
  const { t, format } = useI18n();
  const [actionInput, setActionInput] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => {
      setAction(actionInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [actionInput]);

  const query = { action: action || undefined, page, limit: LIMIT };
  const logs = useQuery({ queryKey: auditLogKeys.list(query), queryFn: () => listAuditLogs(query) });

  const rows = logs.data?.items ?? [];
  const pagination = logs.data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <ScrollText className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('auditLog.title')}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-foreground-muted">{t('auditLog.subtitle')}</p>
      </motion.header>

      <motion.div variants={item} className="mt-6">
        <div className="relative w-72 max-w-full">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
          <input
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            placeholder={t('auditLog.filterPlaceholder')}
            className="h-10 w-full rounded-lg border border-border-strong bg-surface ps-10 pe-3 font-mono text-sm text-foreground placeholder:font-sans placeholder:text-foreground-subtle outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card as="section" className="mt-6 overflow-hidden">
          {logs.isPending ? (
            <div className="space-y-3 p-6" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : logs.isError ? (
            <div className="p-6">
              <Alert tone="error" title={errorMessage(logs.error, t)} />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
                <ScrollText className="size-6" aria-hidden="true" />
              </span>
              <p className="mt-4 font-medium text-foreground">{t('auditLog.empty')}</p>
            </div>
          ) : (
            <motion.ul variants={rows_} initial="hidden" animate="show" className="divide-y divide-border">
              {rows.map((entry) => (
                <motion.li key={entry.id} variants={row} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-6 py-3.5">
                  <div className="min-w-60 flex-1">
                    <p className="font-mono text-sm font-medium text-foreground">{entry.action}</p>
                    <p className="mt-0.5 text-xs text-foreground-subtle">
                      {entry.actor ? (
                        <>
                          {entry.actor.name} <span dir="ltr">· {entry.actor.email}</span>
                        </>
                      ) : (
                        t('auditLog.systemActor')
                      )}
                      {entry.entityType ? ` · ${entry.entityType}${entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ''}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-foreground-subtle">{format.date(entry.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
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
    </motion.div>
  );
}
