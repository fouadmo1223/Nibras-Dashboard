
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToastStore } from '@/stores/toast-store';

const TONES = {
  success: { icon: CircleCheck, accent: 'text-success' },
  error: { icon: CircleAlert, accent: 'text-error' },
};

/** Renders API success/error messages as dismissible toasts (polite live region). CSS-animated to keep motion out of the main bundle. */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:bottom-6 sm:items-end"
    >
        {toasts.map((t) => {
          const { icon: Icon, accent } = TONES[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface-raised p-4 text-sm text-foreground shadow-elevation-3"
            >
              <Icon className={cn('mt-0.5 size-[18px] shrink-0', accent)} aria-hidden="true" />
              <p className="flex-1 leading-5">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-m-1 rounded p-1 text-foreground-subtle transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
    </div>
  );
}
