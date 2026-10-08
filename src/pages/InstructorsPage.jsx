import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ChevronDown, GraduationCap, Globe, Plus, UserPlus } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { useI18n } from '@/i18n/I18nProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { addInstructor, instructorKeys, listInstructors, updateInstructor } from '@/services/instructors.service';
import { toast } from '@/stores/toast-store';
import { addInstructorSchema, instructorProfileSchema } from './instructor-schema';

/** Collapsed row header: avatar, name/email, status, and an expand toggle. */
function RowHeader({ profile, open, onToggle, t }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full flex-wrap items-center gap-4 px-6 py-4 text-start transition-colors hover:bg-surface-muted"
    >
      <Avatar user={profile.user} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{profile.user.name}</p>
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
      <ChevronDown className={cn('size-4 shrink-0 text-foreground-subtle transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
    </button>
  );
}

/** Expanded editor: bilingual headline/bio, social links, save and publish/unpublish. */
function RowEditor({ profile, t }) {
  const queryClient = useQueryClient();
  const schema = useMemo(() => instructorProfileSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      headlineEn: profile.headlineEn ?? '',
      headlineAr: profile.headlineAr ?? '',
      bioEn: profile.bioEn ?? '',
      bioAr: profile.bioAr ?? '',
      websiteUrl: profile.websiteUrl ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      xUrl: profile.xUrl ?? '',
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: instructorKeys.all });
  const save = useMutation({
    mutationFn: (values) => updateInstructor(profile.id, values),
    onSuccess: (result) => {
      toast.success(result.message);
      return refresh();
    },
    onError: (error) => applyFieldErrors(error, setError, ['headlineEn', 'headlineAr', 'bioEn', 'bioAr', 'websiteUrl', 'linkedinUrl', 'xUrl']),
  });
  const publish = useMutation({
    mutationFn: (isPublished) => updateInstructor(profile.id, { isPublished }),
    onSuccess: (result) => {
      toast.success(result.message);
      return refresh();
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit((values) => save.mutate(values))}
      noValidate
      className="space-y-4 border-t border-border bg-surface-muted/40 px-6 py-5"
    >
      {save.isError && save.error.code !== 'VALIDATION_ERROR' ? <Alert tone="error" title={errorMessage(save.error, t)} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('instructors.form.headlineEn')} error={errors.headlineEn?.message}>
          <Input dir="ltr" {...register('headlineEn')} />
        </Field>
        <Field label={t('instructors.form.headlineAr')} error={errors.headlineAr?.message}>
          <Input dir="rtl" {...register('headlineAr')} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('instructors.form.bioEn')} error={errors.bioEn?.message}>
          <textarea dir="ltr" rows={3} {...register('bioEn')} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </Field>
        <Field label={t('instructors.form.bioAr')} error={errors.bioAr?.message}>
          <textarea dir="rtl" rows={3} {...register('bioAr')} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t('instructors.form.website')} error={errors.websiteUrl?.message}>
          <Input dir="ltr" placeholder="https://" {...register('websiteUrl')} />
        </Field>
        <Field label={t('instructors.form.linkedin')} error={errors.linkedinUrl?.message}>
          <Input dir="ltr" placeholder="https://linkedin.com/in/…" {...register('linkedinUrl')} />
        </Field>
        <Field label={t('instructors.form.x')} error={errors.xUrl?.message}>
          <Input dir="ltr" placeholder="https://x.com/…" {...register('xUrl')} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
        <Button
          type="button"
          variant="secondary"
          loading={publish.isPending}
          onClick={() => publish.mutate(!profile.isPublished)}
        >
          {profile.isPublished ? t('instructors.actions.unpublish') : t('instructors.actions.publish')}
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!isDirty}>
          {t('instructors.form.submit')}
        </Button>
      </div>
    </motion.form>
  );
}

/** Admin instructors: grant the role by email, then edit each profile's bilingual content and publish state. */
export default function InstructorsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const instructors = useQuery({ queryKey: instructorKeys.admin(), queryFn: listInstructors });
  const addSchema = useMemo(() => addInstructorSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(addSchema), defaultValues: { email: '' } });

  const add = useMutation({
    mutationFn: addInstructor,
    onSuccess: (result) => {
      toast.success(result.message);
      reset();
      setAddOpen(false);
      setExpanded(result.data.id);
      return queryClient.invalidateQueries({ queryKey: instructorKeys.all });
    },
    onError: (error) => {
      if (['USER_NOT_FOUND', 'ALREADY_INSTRUCTOR'].includes(error.code)) setError('email', { type: 'server', message: error.message });
      else applyFieldErrors(error, setError, ['email']);
    },
  });

  const rows = instructors.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('instructors.title')}</h1>
          <p className="mt-2 max-w-2xl text-foreground-muted">{t('instructors.subtitle')}</p>
        </div>
        <Button onClick={() => setAddOpen((v) => !v)} aria-expanded={addOpen}>
          <Plus className="size-4" aria-hidden="true" />
          {t('instructors.new')}
        </Button>
      </header>

      {addOpen ? (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit((values) => add.mutate(values))}
          noValidate
          className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-surface p-6 shadow-elevation-1"
        >
          {add.isError && !['USER_NOT_FOUND', 'ALREADY_INSTRUCTOR', 'VALIDATION_ERROR'].includes(add.error.code) ? (
            <div className="w-full">
              <Alert tone="error" title={errorMessage(add.error, t)} />
            </div>
          ) : null}
          <div className="min-w-64 flex-1">
            <Field label={t('instructors.form.email')} error={errors.email?.message} hint={t('instructors.form.emailHint')}>
              <Input dir="ltr" type="email" placeholder="layla@example.com" {...register('email')} />
            </Field>
          </div>
          <Button type="submit" loading={add.isPending}>
            <UserPlus className="size-4" aria-hidden="true" />
            {t('instructors.form.addSubmit')}
          </Button>
        </motion.form>
      ) : null}

      <section aria-labelledby="instructors-list" className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-elevation-1">
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
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 font-medium text-foreground">{t('instructors.empty.title')}</p>
            <p className="mt-1 max-w-sm text-sm text-foreground-muted">{t('instructors.empty.body')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((profile) => {
              const open = expanded === profile.id;
              return (
                <li key={profile.id}>
                  <RowHeader profile={profile} open={open} onToggle={() => setExpanded(open ? null : profile.id)} t={t} />
                  {open ? <RowEditor profile={profile} t={t} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
