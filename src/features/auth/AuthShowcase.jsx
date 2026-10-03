import { useSyncExternalStore } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { BookOpen, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { LogoMark } from '@/components/ui/Logo';
import { brand } from '@/constants/brand';

const ease = [0.45, 0, 0.55, 1];

function useDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia('(min-width: 1024px)');
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => false,
  );
}

function Floating({ className, depth, delay, mx, my, still, children }) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div className={`absolute ${className}`} style={{ x, y }}>
      <motion.div
        initial={false}
        animate={still ? { y: 0 } : { y: [0, -8, 0] }}
        transition={still ? { duration: 0 } : { duration: 5.5 + Math.abs(depth) / 12, delay, repeat: Infinity, ease }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const glass = 'rounded-2xl border border-white/12 bg-white/[0.06] text-white shadow-[0_24px_70px_-24px_rgb(0_0_0/0.7)] backdrop-blur-md';

/** Stylised analytics window: chart lines draw, bars rise, ring fills — illustrative, no data. */
function AnalyticsWindow({ still }) {
  const loop = (duration, delay = 0) =>
    still ? { duration: 0 } : { duration, delay, repeat: Infinity, repeatType: 'reverse', repeatDelay: 1.5, ease: 'easeInOut' };
  const bars = [0.45, 0.7, 0.55, 0.9, 0.65, 0.8];

  return (
    <div className={`${glass} w-[26rem] p-5`}>
      <div className="flex items-center gap-1.5">
        {['bg-rose-500', 'bg-amber-500', 'bg-emerald-500'].map((c) => (
          <span key={c} className={`size-2.5 rounded-full ${c} opacity-80`} />
        ))}
        <span className="ms-3 h-2 w-24 rounded-full bg-white/15" />
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto] gap-5">
        <svg viewBox="0 0 240 110" className="h-28 w-full" aria-hidden="true">
          <defs>
            <linearGradient id="nb-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#6E82FF" stopOpacity="0.45" />
              <stop offset="1" stopColor="#6E82FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 55, 85].map((y) => (
            <line key={y} x1="0" x2="240" y1={y} y2={y} stroke="white" strokeOpacity="0.08" />
          ))}
          <motion.path
            d="M0 92 C30 80 45 86 70 66 S110 70 130 48 S175 52 195 30 S225 24 240 14 L240 110 L0 110Z"
            fill="url(#nb-area)"

          />
          <motion.path
            d="M0 92 C30 80 45 86 70 66 S110 70 130 48 S175 52 195 30 S225 24 240 14"
            fill="none"
            stroke="#6E82FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...loop(2.2, 0.4), ...(still ? {} : { repeatDelay: 2.5 }) }}
          />
          <motion.path
            d="M0 100 C40 96 60 90 90 84 S140 80 170 70 S220 60 240 52"
            fill="none"
            stroke="#FF7A45"
            strokeWidth="2"
            strokeDasharray="4 5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={loop(2.6, 0.8)}
          />
        </svg>

        <svg viewBox="0 0 44 44" className="size-24 -rotate-90" aria-hidden="true">
          <circle cx="22" cy="22" r="17" fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="5" />
          <motion.circle
            cx="22"
            cy="22"
            r="17"
            fill="none"
            stroke="#FF7A45"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 0.72 }}
            transition={loop(1.8, 0.6)}
          />
        </svg>
      </div>

      <div className="mt-5 flex h-16 items-end gap-2.5">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="flex-1 origin-bottom rounded-t-md bg-gradient-to-t from-cobalt-600 to-cobalt-400"
            style={{ height: `${h * 100}%` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: still ? 1 : [0.25, 1] }}
            transition={loop(1.4, 0.3 + i * 0.12)}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label, tone = 'bg-white/15' }) {
  return (
    <div className={`${glass} flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium`}>
      <span className={`grid size-7 place-items-center rounded-lg ${tone}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      {label}
    </div>
  );
}

function Scene({ animate }) {
  const still = useReducedMotion() || !animate;
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const mx = useSpring(px, { stiffness: 60, damping: 18 });
  const my = useSpring(py, { stiffness: 60, damping: 18 });
  const shared = { mx, my, still };

  return (
    <div
      className="absolute inset-0"
      onPointerMove={(e) => {
        if (still) return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div
        className="absolute -top-28 left-1/4 size-[30rem] rounded-full bg-cobalt-600/35 blur-3xl"
        animate={still ? undefined : { x: [0, 40, -20, 0], y: [0, 25, -15, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease }}
      />
      <motion.div
        className="absolute -bottom-36 -right-20 size-[26rem] rounded-full bg-ember-500/20 blur-3xl"
        animate={still ? undefined : { x: [0, -30, 15, 0], y: [0, -25, 10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease }}
      />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />

      <Floating className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" depth={14} delay={0.2} {...shared}>
        <AnalyticsWindow still={still} />
      </Floating>
      <Floating className="left-[7%] top-[12%]" depth={-30} delay={0.5} {...shared}>
        <Chip icon={BookOpen} label="Courses" tone="bg-cobalt-500/40" />
      </Floating>
      <Floating className="right-[8%] top-[9%]" depth={28} delay={0.7} {...shared}>
        <Chip icon={Users} label="Students" tone="bg-ember-500/35" />
      </Floating>
      <Floating className="left-[8%] bottom-[8%]" depth={-22} delay={0.9} {...shared}>
        <Chip icon={GraduationCap} label="Instructors" tone="bg-emerald-500/35" />
      </Floating>
      <Floating className="right-[8%] bottom-[12%]" depth={24} delay={1.1} {...shared}>
        <Chip icon={ShieldCheck} label="Roles & permissions" tone="bg-white/15" />
      </Floating>
    </div>
  );
}

/** Desktop-only illustrated half of the dashboard sign-in layout. */
export default function AuthShowcase() {
  const desktop = useDesktop();
  return (
    <aside aria-hidden="true" className="relative flex h-full flex-col overflow-hidden bg-ink-950 text-white">
      {/* Scene and copy stack, so floating elements never overlap the headline at short heights. */}
      <div className="relative min-h-0 flex-1">
        <Scene animate={desktop} />
      </div>
      <div className="pointer-events-none relative px-14 pb-14 pt-2">
        <div className="flex items-center gap-3">
          <LogoMark className="size-9" />
          <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs font-medium text-white/70">Admin</span>
        </div>
        <p className="mt-5 max-w-md text-4xl font-semibold leading-tight tracking-tight">
          Run {brand.name} with clarity.
        </p>
        <p className="mt-3 max-w-md text-white/60">Courses, learners, instructors and revenue — one secure workspace.</p>
      </div>
    </aside>
  );
}
