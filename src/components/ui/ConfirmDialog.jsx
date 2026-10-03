
import { useEffect, useId, useRef } from 'react';
import Button from './Button';

/**
 * Accessible confirmation modal on the native <dialog> element (focus trap, Esc,
 * inert background). Focus starts on "Cancel" so Enter never confirms by accident.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  icon: Icon,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const cancelRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    // Backdrop click is a mouse convenience; keyboard users dismiss with Esc (native dialog cancel).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        event.preventDefault(); // Esc: let React state decide
        if (!loading) onCancel?.();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !loading) onCancel?.(); // backdrop click
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface-raised p-0 text-foreground shadow-elevation-3 backdrop:bg-black/55 backdrop:backdrop-blur-sm open:animate-dialog-in"
    >
      <div className="p-6 sm:p-7">
        {Icon && (
          <span
            className={`mb-4 grid size-11 place-items-center rounded-full ${tone === 'danger' ? 'bg-error-soft text-error' : 'bg-primary-soft text-primary'}`}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-1.5 text-sm leading-6 text-foreground-muted">
            {description}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className={tone === 'danger' ? 'bg-error text-white shadow-none hover:bg-error/90' : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
