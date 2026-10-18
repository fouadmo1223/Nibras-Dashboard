import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { GraduationCap, Globe, Link2, UserCircle2, UserPlus } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Avatar from '@/components/ui/Avatar';
import BilingualField from '@/components/ui/BilingualField';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Field from '@/components/ui/Field';
import FormSection from '@/components/ui/FormSection';
import Input from '@/components/ui/Input';
import { useI18n } from '@/i18n/I18nProvider';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { addInstructor, getInstructor, instructorKeys, updateInstructor } from '@/services/instructors.service';
import { toast } from '@/stores/toast-store';
import { addInstructorSchema, instructorProfileSchema } from './instructor-schema';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 28 } } };

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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
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
      </motion.div>

      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="space-y-5">
        {save.isError && save.error.code !== 'VALIDATION_ERROR' ? (
          <motion.div variants={item}>
            <Alert tone="error" title={errorMessage(save.error, t)} />
          </motion.div>
        ) : null}

        <FormSection icon={UserCircle2} title={t('instructors.form.sections.profile')} description={t('instructors.form.sections.profileHint')}>
          <div className="md:col-span-2">
            <BilingualField label={t('instructors.form.headline')} nameEn="headlineEn" nameAr="headlineAr" register={register} errors={errors} />
          </div>
          <div className="md:col-span-2">
            <BilingualField label={t('instructors.form.bio')} nameEn="bioEn" nameAr="bioAr" register={register} errors={errors} multiline rows={4} />
          </div>
        </FormSection>

        <FormSection icon={Link2} title={t('instructors.form.sections.links')} description={t('instructors.form.sections.linksHint')} bodyClassName="md:grid-cols-3">
          <Field label={t('instructors.form.website')} error={errors.websiteUrl?.message}>
            <Input dir="ltr" placeholder="https://" {...register('websiteUrl')} />
          </Field>
          <Field label={t('instructors.form.linkedin')} error={errors.linkedinUrl?.message}>
            <Input dir="ltr" placeholder="https://linkedin.com/in/…" {...register('linkedinUrl')} />
          </Field>
          <Field label={t('instructors.form.x')} error={errors.xUrl?.message}>
            <Input dir="ltr" placeholder="https://x.com/…" {...register('xUrl')} />
          </Field>
        </FormSection>

        <motion.div variants={item} className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/instructors')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            {t('instructors.form.submit')}
          </Button>
        </motion.div>
      </form>
    </motion.div>
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
