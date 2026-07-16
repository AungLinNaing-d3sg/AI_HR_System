'use client';

import { useMutation } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateUserFormValues } from '@/lib/validators/auth.validators';

/** Creates a new user account. `SystemAdmin`-only; the backend and the `/api/auth/users` Route Handler both enforce this independently of any client-side check. */
export function useCreateUser() {
  const mutation = useMutation({
    mutationFn: (values: CreateUserFormValues) => authApi.createUser(values),
  });

  return {
    createUser: mutation.mutateAsync,
    isCreating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}
