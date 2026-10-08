import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ChevronRight, GraduationCap, Globe, Plus } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { instructorKeys, listInstructors } from '@/services/instructors.service';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

/** Admin instructors: grant the role by email and manage each profile; add/edit live on their own pages. */
export default function InstructorsPage() {
  const { t } = useI18n();
  const instructors = useQuery({ queryKey: instructorKeys.admin(), queryFn: listInstructors });

  const rows = instructors.data ?? [];
  const publishedCount = rows.filter((r) => r.isPublished).length;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={item} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('instructors.title')}</h1>
          </div>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('instructors.subtitle')}</p>
          {!instructors.isPending && !instructors.isError && rows.length > 0 ? (
            <p className="mt-2 text-sm text-foreground-subtle">
              {t('instructors.summary', { count: rows.length, published: publishedCount })}
            </p>
          ) : null}
        </div>
        <Button as={Link} to="/instructors/new">
          <Plus className="size-4" aria-hidden="true" />
          {t('instructors.new')}
        </Button>
      </motion.header>

      <motion.section
        variants={item}
        aria-labelledby="instructors-list"
        className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-elevation-1"
      >
        <h2 id="instructors-list" className="sr-only">
          {t('instructors.title')}
        </h2>
        {instructors.isPending ? (
          <div className="space-y-3 p-6" aria-busy="true" aria-label={t('instructors.loading')}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : instructors.isError ? (
          <div className="p-6">
            <Alert tone="error" title={errorMessage(instructors.error, t)} />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary ring-8 ring-primary-soft/40">
              <GraduationCap className="size-7" aria-hidden="true" />
            </span>
            <p className="mt-5 text-base font-medium text-foreground">{t('instructors.empty.title')}</p>
            <p className="mt-1.5 max-w-sm text-sm text-foreground-muted">{t('instructors.empty.body')}</p>
            <Button as={Link} to="/instructors/new" className="mt-6">
              <Plus className="size-4" aria-hidden="true" />
              {t('instructors.new')}
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((profile) => (
              <li key={profile.id}>
                <Link
                  to={`/instructors/${profile.id}`}
                  className="group flex w-full flex-wrap items-center gap-4 px-6 py-4 text-start transition-colors hover:bg-surface-muted"
                >
                  <Avatar user={profile.user} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground group-hover:text-primary">{profile.user.name}</p>
                    <p className="truncate text-sm text-foreground-subtle">{profile.user.email}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
                      profile.isPublished ? 'bg-success-soft text-success' : 'bg-surface-muted text-foreground-muted',
                    )}
                  >
                    <Globe className="size-3.5" aria-hidden="true" />
                    {profile.isPublished ? t('instructors.status.published') : t('instructors.status.draft')}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-foreground-subtle rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </motion.div>
  );
}
