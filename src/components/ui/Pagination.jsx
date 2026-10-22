import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

/** Page numbers to render around the current page, collapsing long runs into a single ellipsis. */
function pageWindow(current, total) {
  const keep = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(`e${p}`);
    out.push(p);
    prev = p;
  }
  return out;
}

/** Numbered pagination (Previous / page numbers with an ellipsis for long runs / Next) shared by every paginated admin list. */
export default function Pagination({ page, totalPages, onChange, className }) {
  const { t } = useI18n();
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav
      aria-label={t('common.pagination.status', { page, totalPages })}
      className={cn('flex items-center justify-between gap-3 border-t border-border px-6 py-3', className)}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40 sm:px-3"
      >
        <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        <span className="hidden sm:inline">{t('common.pagination.previous')}</span>
      </button>

      <div className="flex items-center gap-1 overflow-x-auto">
        {pageWindow(page, totalPages).map((p) =>
          typeof p === 'number' ? (
            <button
              key={p}
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
              className={cn(
                'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-colors',
                p === page ? 'bg-primary text-primary-foreground shadow-elevation-1' : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
              )}
            >
              {p}
            </button>
          ) : (
            <span key={p} className="px-1 text-sm text-foreground-subtle" aria-hidden="true">
              …
            </span>
          ),
        )}
      </div>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40 sm:px-3"
      >
        <span className="hidden sm:inline">{t('common.pagination.next')}</span>
        <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </button>
    </nav>
  );
}
