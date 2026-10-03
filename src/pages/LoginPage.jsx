import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import AuthCard from '@/features/auth/AuthCard';
import { loginSchema } from '@/features/auth/auth-schemas';
import { useLogin, useSession } from '@/features/auth/use-auth';
import { applyFieldErrors, errorMessage } from '@/lib/api-errors';
import { safeRedirect } from '@/lib/safe-redirect';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const session = useSession();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const destination = safeRedirect(params.get('next'));
  if (session.data && !login.isPending) return <Navigate to={destination} replace />;

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => navigate(destination, { replace: true }),
      onError: (error) => applyFieldErrors(error, setError, ['email', 'password']),
    }),
  );

  return (
    <AuthCard title="Sign in" subtitle="Use your Nibras staff account.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {login.isError && <Alert tone="error" title={errorMessage(login.error)} />}
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="username" inputMode="email" {...register('email')} />
        </Field>
        <Field
          label="Password"
          error={errors.password?.message}
          action={
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot?
            </Link>
          }
        >
          <PasswordInput autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
