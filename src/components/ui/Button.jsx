import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-elevation-1',
  secondary: 'border border-border-strong bg-surface text-foreground hover:bg-surface-muted',
  ghost: 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
  danger: 'border border-error/30 bg-error-soft text-error hover:bg-error hover:text-white',
};

const SIZES = {
  sm: 'h-9 gap-1.5 rounded-md px-3 text-sm',
  md: 'h-11 gap-2 rounded-md px-4 text-sm',
  lg: 'h-12 gap-2 rounded-lg px-5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ref,
  ...props
}) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-standard active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
