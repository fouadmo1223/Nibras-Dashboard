import { cn } from '@/lib/cn';

const VARIANTS = {
  default: 'border border-border bg-surface shadow-elevation-1',
  dashed: 'border border-dashed border-border-strong bg-surface',
};

/**
 * Shared surface for dashboard sections/list containers: the border+radius+shadow
 * foundation other components layer their own content onto. Polymorphic via `as`.
 */
export default function Card({ as: Tag = 'div', variant = 'default', className, children, ...props }) {
  return (
    <Tag className={cn('rounded-2xl', VARIANTS[variant], className)} {...props}>
      {children}
    </Tag>
  );
}
