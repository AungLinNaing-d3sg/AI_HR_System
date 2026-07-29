'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useResetPassword } from '@/hooks/useResetPassword';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validators/auth.validators';
import type { AdminUserListItem } from '@/types/domain.types';

export interface ResetPasswordFormProps {
  user: AdminUserListItem;
  /** Called after a successful reset so the parent modal can close itself. */
  onSuccess: () => void;
  /** Called when the admin cancels out of the form without saving. */
  onCancel: () => void;
}

/**
 * Row-level "Reset Password" form for the `SystemAdmin`-only `/admin/users`
 * management table (see `UsersTable`/`ResetPasswordFormModal`), backed by
 * `PUT /Auth/ResetPassword/{id}` (see
 * docs/HR_System_BE.postman_collection.json). Unlike `ChangePasswordForm`,
 * there is no "current password" field - the admin is setting a new
 * password for someone else's account, not proving they know their own
 * existing one.
 */
export function ResetPasswordForm({ user, onSuccess, onCancel }: ResetPasswordFormProps) {
  const { resetPassword, isResetting, error, reset: resetMutation } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    resetMutation();
    try {
      await resetPassword({ id: user.userId, values });
      onSuccess();
    } catch {
      // Surfaced via `error` below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <Label htmlFor="reset-newPassword">New password</Label>
        <Input
          id="reset-newPassword"
          type="password"
          autoComplete="new-password"
          hasError={Boolean(errors.newPassword)}
          aria-describedby={errors.newPassword ? 'reset-newPassword-error' : undefined}
          {...register('newPassword')}
        />
        <FieldError id="reset-newPassword-error" message={errors.newPassword?.message} />
      </div>

      <div>
        <Label htmlFor="reset-confirmNewPassword">Confirm new password</Label>
        <Input
          id="reset-confirmNewPassword"
          type="password"
          autoComplete="new-password"
          hasError={Boolean(errors.confirmNewPassword)}
          aria-describedby={errors.confirmNewPassword ? 'reset-confirmNewPassword-error' : undefined}
          {...register('confirmNewPassword')}
        />
        <FieldError id="reset-confirmNewPassword-error" message={errors.confirmNewPassword?.message} />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isResetting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isResetting}>
          {isResetting ? 'Resetting…' : 'Reset password'}
        </Button>
      </div>
    </form>
  );
}
