'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateUserFormValues } from '@/lib/validators/auth.validators';

export interface UpdateUserVariables {
  id: string;
  values: UpdateUserFormValues;
}

/**
 * Updates an existing user account (`PUT /Auth/UpdateUser/{id}` via
 * `PUT /api/auth/users/:id`) - shared by `UserEditForm`'s "Save changes"
 * submit and `UsersTable`'s row-level Activate/Deactivate action (the
 * latter resubmits the row's current values with only `isActive` flipped,
 * since there is no dedicated deactivate/delete endpoint for a user
 * account). Takes `{ id, values }` together (rather than being bound to a
 * single id like `useUpdateCountry`) so one hook instance can serve every
 * row's toggle button on the table, not just a single open edit modal.
 * Invalidates the `/admin/users` management table's list (`['auth',
 * 'users']`) so it refetches and reflects the change.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, values }: UpdateUserVariables) => authApi.updateUser(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });
    },
  });

  return {
    updateUser: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update the user.') : null,
    reset: mutation.reset,
  };
}
