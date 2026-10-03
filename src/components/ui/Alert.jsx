import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

const TONES = {
  error: { icon: AlertCircle, className: 'border-error/25 bg-error-soft text-error' },
  success: { icon: CheckCircle2, className: 'border-success/25 bg-success-soft text-success' },
  info: { icon: Info, className: 'border-info/25 bg-info-soft text-info' },
};

export default function Alert({ tone = 'info', title, children, className }) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border px-3.5 py-3 text-sm', toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-foreground-muted">{children}</div>}
      </div>
    </div>
  );
}
