import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import AuthCard from '@/features/auth/AuthCard';
import { forgotPasswordSchema } from '@/features/auth/auth-schemas';
import { errorMessage } from '@/lib/api-errors';
import { forgotPassword } from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const request = useMutation({ mutationFn: ({ email }) => forgotPassword(email) });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  return (
    <AuthCard
      title="Reset password"
      subtitle="We’ll email you a link to choose a new password."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          ← Back to sign in
        </Link>
      }
    >
      {request.isSuccess ? (
        <Alert tone="success" title="Check your inbox">
          {request.data.message}
        </Alert>
      ) : (
        <form onSubmit={handleSubmit((v) => request.mutate(v))} noValidate className="space-y-5">
          {request.isError && <Alert tone="error" title={errorMessage(request.error)} />}
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="username" inputMode="email" {...register('email')} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={request.isPending}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
