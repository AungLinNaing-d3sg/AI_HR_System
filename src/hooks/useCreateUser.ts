'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateUserFormValues } from '@/lib/validators/auth.validators';

/**
 * Creates a new user account. `SystemAdmin`-only; the backend and the
 * `/api/auth/users` Route Handler both enforce this independently of any
 * client-side check. Invalidates both the `/admin/users` management table's
 * list (`['auth', 'users']`) and the "Add User to Project" dropdown's list
 * (`['auth', 'user-list']`) so they refetch and include the new account.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateUserFormValues) => authApi.createUser(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['auth', 'user-list'] });
    },
  });

  return {
    createUser: mutation.mutateAsync,
    isCreating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}
