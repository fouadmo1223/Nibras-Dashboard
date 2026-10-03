import { useMemo } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import AuthCard from '@/features/auth/AuthCard';
import { forgotPasswordSchema } from '@/features/auth/auth-schemas';
import { useI18n } from '@/i18n/I18nProvider';
import { errorMessage } from '@/lib/api-errors';
import { forgotPassword } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const request = useMutation({ mutationFn: ({ email }) => forgotPassword(email) });
  const schema = useMemo(() => forgotPasswordSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  return (
    <AuthCard
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          {t('auth.forgot.back')}
        </Link>
      }
    >
      {request.isSuccess ? (
        <Alert tone="success" title={t('auth.forgot.checkInbox')}>
          {request.data.message}
        </Alert>
      ) : (
        <form onSubmit={handleSubmit((v) => request.mutate(v))} noValidate className="space-y-5">
          {request.isError && <Alert tone="error" title={errorMessage(request.error, t)} />}
          <Field label={t('fields.email')} error={errors.email?.message}>
            <Input type="email" dir="ltr" autoComplete="username" inputMode="email" {...register('email')} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={request.isPending}>
            {t('auth.forgot.submit')}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
