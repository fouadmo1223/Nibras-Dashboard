import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { inputClassName } from './Input';

const toISODate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

/** 6×7 grid of Date objects spanning the full weeks that cover the given month. */
function buildMonthGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

/**
 * A custom popover calendar replacing the native `<input type="date">` — native date-picker
 * popups can't be restyled with CSS at all, which looked out of place against the rest of the
 * (dark, branded) UI. Value/onChange use plain `YYYY-MM-DD` strings, same contract as a native
 * date input, so it drops in anywhere one was used.
 */
export default function DatePicker({ value, onChange, placeholder, label, className }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const rootRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openPicker = () => {
    setViewDate(selected ?? new Date());
    setOpen(true);
  };

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewDate);
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, i + 7); // a known Sunday-start week
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  });
  const days = buildMonthGrid(viewDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately re-reads "now" only when the popover opens
  const today = useMemo(() => new Date(), [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? setOpen(false) : openPicker())}
        dir="ltr"
        className={cn(inputClassName, 'flex items-center gap-2.5 text-start', !value && 'text-foreground-subtle')}
      >
        <Calendar className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
        <span className="flex-1 truncate">{selected ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(selected) : placeholder}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="group"
            aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className="absolute end-0 top-full z-50 mt-2 w-72 origin-top-right rounded-xl border border-border bg-surface-raised p-3 shadow-elevation-3 rtl:origin-top-left"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                aria-label={t('common.previous')}
                className="grid size-8 place-items-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <ChevronRight className="size-4 rtl:hidden" aria-hidden="true" />
                <ChevronLeft className="hidden size-4 rtl:block" aria-hidden="true" />
              </button>
              <span className="text-sm font-medium text-foreground">{monthLabel}</span>
              <button
                type="button"
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                aria-label={t('common.next')}
                className="grid size-8 place-items-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <ChevronLeft className="size-4 rtl:hidden" aria-hidden="true" />
                <ChevronRight className="hidden size-4 rtl:block" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1">
              {weekdayLabels.map((label, i) => (
                <span key={i} className="grid h-7 place-items-center text-[11px] font-medium text-foreground-subtle">
                  {label}
                </span>
              ))}
              {days.map((day, i) => {
                const inMonth = day.getMonth() === viewDate.getMonth();
                const isSelected = selected && sameDay(day, selected);
                const isToday = sameDay(day, today);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(toISODate(day));
                      setOpen(false);
                    }}
                    className={cn(
                      'grid h-8 place-items-center rounded-lg text-sm transition-colors',
                      !inMonth && 'text-foreground-subtle/50',
                      inMonth && !isSelected && 'text-foreground hover:bg-surface-muted',
                      isSelected && 'bg-primary font-semibold text-primary-foreground',
                      !isSelected && isToday && 'font-semibold text-primary',
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
              >
                {t('common.clear')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(toISODate(today));
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                {t('common.today')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
