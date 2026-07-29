'use client';

import { useMutation } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { ResetPasswordFormValues } from '@/lib/validators/auth.validators';

export interface ResetPasswordVariables {
  id: string;
  values: ResetPasswordFormValues;
}

/**
 * Resets another user's password (`PUT /Auth/ResetPassword/{id}` via
 * `PUT /api/auth/users/:id/reset-password`) - backs the `SystemAdmin`-only
 * `/admin/users` management table's row-level "Reset Password" action (see
 * `ResetPasswordForm`). Unlike `useUpdateUser`, there is nothing to
 * invalidate: `GET /Auth/GetUserList` never returns password data, so the
 * `/admin/users` table row itself doesn't change as a result of this call.
 */
export function useResetPassword() {
  const mutation = useMutation({
    mutationFn: ({ id, values }: ResetPasswordVariables) => authApi.resetPassword(id, values),
  });

  return {
    resetPassword: mutation.mutateAsync,
    isResetting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not reset the password.') : null,
    reset: mutation.reset,
  };
}
