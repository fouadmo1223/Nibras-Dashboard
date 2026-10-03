import { cloneElement, isValidElement, useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Label + control + hint/error, wired for accessibility: the control receives
 * id, aria-invalid and aria-describedby automatically.
 */
export default function Field({ label, hint, error, children, className, action }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {action}
      </div>
      {isValidElement(children)
        ? cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })
        : children}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-foreground-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
