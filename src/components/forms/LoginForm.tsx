'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { loginSchema, type LoginFormValues } from '@/lib/validators/auth.validators';

/** A relative, same-origin path only - never redirects off-site with a raw query value. */
function sanitizeRedirectTarget(rawValue: string | null): string {
  if (!rawValue || !rawValue.startsWith('/') || rawValue.startsWith('//')) {
    return '/dashboard';
  }
  return rawValue;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggingIn, loginError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { usernameOrEmail: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      router.push(sanitizeRedirectTarget(searchParams.get('redirect')));
    } catch {
      // Surfaced via `loginError` from `useAuth`; nothing further to do here.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-sm space-y-4">
      {loginError && <Alert variant="error">{loginError}</Alert>}

      <div>
        <Label htmlFor="usernameOrEmail">Username or email</Label>
        <Input
          id="usernameOrEmail"
          type="text"
          autoComplete="username"
          hasError={Boolean(errors.usernameOrEmail)}
          aria-describedby={errors.usernameOrEmail ? 'usernameOrEmail-error' : undefined}
          {...register('usernameOrEmail')}
        />
        <FieldError id="usernameOrEmail-error" message={errors.usernameOrEmail?.message} />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          hasError={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      <Button type="submit" className="w-full" isLoading={isLoggingIn}>
        {isLoggingIn ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
