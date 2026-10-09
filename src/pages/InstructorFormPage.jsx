import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { GraduationCap, Globe, UserPlus } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { useI18n } from '@/i18n/I18nProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { addInstructor, getInstructor, instructorKeys, updateInstructor } from '@/services/instructors.service';
import { toast } from '@/stores/toast-store';
import { addInstructorSchema, instructorProfileSchema } from './instructor-schema';

const textareaClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Step one: grant the instructor role by email (`/instructors/new`). Lands on the edit page to fill in the profile. */
function AddByEmailForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schema = useMemo(() => addInstructorSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const add = useMutation({
    mutationFn: addInstructor,
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: instructorKeys.all });
      navigate(`/instructors/${result.data.id}`, { replace: true });
    },
    onError: (error) => {
      if (['USER_NOT_FOUND', 'ALREADY_INSTRUCTOR'].includes(error.code)) setError('email', { type: 'server', message: error.message });
      else applyFieldErrors(error, setError, ['email']);
    },
  });

  return (
    <Card as="form" onSubmit={handleSubmit((values) => add.mutate(values))} noValidate className="mt-8 p-6">
      {add.isError && !['USER_NOT_FOUND', 'ALREADY_INSTRUCTOR', 'VALIDATION_ERROR'].includes(add.error.code) ? (
        <div className="mb-4">
          <Alert tone="error" title={errorMessage(add.error, t)} />
        </div>
      ) : null}
      <Field label={t('instructors.form.email')} error={errors.email?.message} hint={t('instructors.form.emailHint')}>
        <Input dir="ltr" type="email" placeholder="layla@example.com" {...register('email')} />
      </Field>
      <div className="mt-5 flex justify-end">
        <Button type="submit" loading={add.isPending}>
          <UserPlus className="size-4" aria-hidden="true" />
          {t('instructors.form.addSubmit')}
        </Button>
      </div>
    </Card>
  );
}

/** Step two: edit the bilingual profile and publish state (`/instructors/:id`). */
function EditProfileForm({ id }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schema = useMemo(() => instructorProfileSchema(t), [t]);
  const detail = useQuery({ queryKey: instructorKeys.detail(id), queryFn: () => getInstructor(id) });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { headlineEn: '', headlineAr: '', bioEn: '', bioAr: '', websiteUrl: '', linkedinUrl: '', xUrl: '' },
  });

  useEffect(() => {
    if (detail.data) {
      reset({
        headlineEn: detail.data.headlineEn ?? '',
        headlineAr: detail.data.headlineAr ?? '',
        bioEn: detail.data.bioEn ?? '',
        bioAr: detail.data.bioAr ?? '',
        websiteUrl: detail.data.websiteUrl ?? '',
        linkedinUrl: detail.data.linkedinUrl ?? '',
        xUrl: detail.data.xUrl ?? '',
      });
    }
  }, [detail.data, reset]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: instructorKeys.all });
  const save = useMutation({
    mutationFn: (values) => updateInstructor(id, values),
    onSuccess: (result) => {
      toast.success(result.message);
      refresh();
    },
    onError: (error) => applyFieldErrors(error, setError, ['headlineEn', 'headlineAr', 'bioEn', 'bioAr', 'websiteUrl', 'linkedinUrl', 'xUrl']),
  });
  const publish = useMutation({
    mutationFn: (isPublished) => updateInstructor(id, { isPublished }),
    onSuccess: (result) => {
      toast.success(result.message);
      return refresh();
    },
    onError: (error) => toast.error(errorMessage(error, t)),
  });

  if (detail.isPending) {
    return (
      <div className="mt-8 space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-96 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );
  }
  if (detail.isError) {
    return (
      <div className="mt-8">
        <Alert tone="error" title={errorMessage(detail.error, t)} />
      </div>
    );
  }

  const profile = detail.data;

  return (
    <>
      <Card className="mt-8 flex flex-wrap items-center gap-4 p-6">
        <Avatar user={profile.user} size="lg" />
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
        <Button variant="secondary" loading={publish.isPending} onClick={() => publish.mutate(!profile.isPublished)}>
          {profile.isPublished ? t('instructors.actions.unpublish') : t('instructors.actions.publish')}
        </Button>
      </Card>

      <Card as="form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="mt-6 space-y-5 p-6">
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
            <textarea dir="ltr" rows={4} {...register('bioEn')} className={textareaClass} />
          </Field>
          <Field label={t('instructors.form.bioAr')} error={errors.bioAr?.message}>
            <textarea dir="rtl" rows={4} {...register('bioAr')} className={textareaClass} />
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
          <Button type="button" variant="secondary" onClick={() => navigate('/instructors')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            {t('instructors.form.submit')}
          </Button>
        </div>
      </Card>
    </>
  );
}

/** Add an instructor by email, or edit an existing profile (`/instructors/new` or `/instructors/:id`). */
export default function InstructorFormPage() {
  const { id } = useParams();
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{id ? t('instructors.edit') : t('instructors.new')}</h1>
      </div>
      {id ? <EditProfileForm id={id} /> : <AddByEmailForm />}
    </div>
  );
}
