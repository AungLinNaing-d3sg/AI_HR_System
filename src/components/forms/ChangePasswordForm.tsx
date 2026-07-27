'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useChangePassword } from '@/hooks/useChangePassword';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/lib/validators/auth.validators';

export function ChangePasswordForm() {
  const { changePassword, isChanging, isSuccess, error, reset: resetMutation } = useChangePassword();

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    resetMutation();
    try {
      await changePassword(values);
      resetForm();
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900">Change password</h2>

      {error && <Alert variant="error">{error}</Alert>}
      {isSuccess && <Alert variant="success">Your password has been changed.</Alert>}

      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          hasError={Boolean(errors.currentPassword)}
          aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
          {...register('currentPassword')}
        />
        <FieldError id="currentPassword-error" message={errors.currentPassword?.message} />
      </div>

      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          hasError={Boolean(errors.newPassword)}
          aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
          {...register('newPassword')}
        />
        <FieldError id="newPassword-error" message={errors.newPassword?.message} />
      </div>

      <div>
        <Label htmlFor="confirmNewPassword">Confirm new password</Label>
        <Input
          id="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          hasError={Boolean(errors.confirmNewPassword)}
          aria-describedby={errors.confirmNewPassword ? 'confirmNewPassword-error' : undefined}
          {...register('confirmNewPassword')}
        />
        <FieldError id="confirmNewPassword-error" message={errors.confirmNewPassword?.message} />
      </div>

      <Button type="submit" isLoading={isChanging}>
        {isChanging ? 'Changing…' : 'Change password'}
      </Button>
    </form>
  );
}
