import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import Card from './Card';

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

/**
 * One titled, icon-badged card holding a related slice of a form (e.g. "Pricing", "Content").
 * Long forms read as a stack of focused cards instead of one undifferentiated grid.
 */
export default function FormSection({ icon: Icon, title, description, children, className, bodyClassName }) {
  return (
    <motion.div variants={item}>
      <Card className={cn('overflow-hidden', className)}>
        <header className="flex items-start gap-3 border-b border-border px-6 py-5">
          {Icon ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-foreground-muted">{description}</p> : null}
          </div>
        </header>
        <div className={cn('grid gap-5 p-6 md:grid-cols-2', bodyClassName)}>{children}</div>
      </Card>
    </motion.div>
  );
}
