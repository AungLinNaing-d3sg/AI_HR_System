'use client';

import { useMutation } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { ChangePasswordFormValues } from '@/lib/validators/auth.validators';

/** Changes the signed-in user's password. Does not affect the current session/tokens. */
export function useChangePassword() {
  const mutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) => authApi.changePassword(values),
  });

  return {
    changePassword: mutation.mutateAsync,
    isChanging: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}
