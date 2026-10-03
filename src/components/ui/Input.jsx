import { cn } from '@/lib/cn';

export const inputClassName =
  'block h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-[15px] text-foreground placeholder:text-foreground-subtle shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/15 disabled:cursor-not-allowed disabled:opacity-60';

export default function Input({ className, ref, ...props }) {
  return <input ref={ref} className={cn(inputClassName, className)} {...props} />;
}
