import { motion, useReducedMotion } from 'motion/react';
import Logo from '@/components/ui/Logo';

/**
 * Full-screen "checking your session" state: a soft ambient glow, the brand mark with a
 * gentle breathing pulse, and an indeterminate progress bar that sweeps back and forth.
 * Reduce Motion keeps the glow and swap a static bar for the sweeping one.
 */
export default function SessionLoading({ label, brandLabel, locale }) {
  const reduce = useReducedMotion();

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_42%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_70%)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="relative flex flex-col items-center gap-5"
        aria-busy="true"
        aria-label={label}
      >
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Logo label={brandLabel} lang={locale} markClassName="size-9" />
        </motion.div>

        <div className="h-1 w-48 overflow-hidden rounded-full bg-surface-muted">
          {reduce ? (
            <div className="h-full w-1/3 rounded-full bg-primary" />
          ) : (
            <motion.div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
              animate={{ x: ['-100%', '220%'] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        <p className="text-sm text-foreground-subtle">{label}</p>
      </motion.div>
    </main>
  );
}
