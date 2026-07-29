'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { useAuthStore } from '@/stores/auth.store';
import type { UpdateUserFormValues } from '@/lib/validators/auth.validators';
import type { AdminUserListItem } from '@/types/domain.types';

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
 *
 * A `SystemAdmin` can edit their own row from `/admin/users` (unlike the
 * Activate/Deactivate toggle, "Edit" isn't disabled for `isSelf` - see
 * `UsersTable`), which previously left the signed-in identity in
 * `auth.store` stale until the next login: the Sidebar/`UserMenu` render
 * `useAuth().user`, not this table's row data, so a name/username change
 * made here wouldn't show up in that chrome without this sync. When the
 * updated account matches the signed-in user, this merges the response's
 * `username`/`firstName`/`lastName`/`email`/`employeeId`/`countryId` into
 * the stored profile so that chrome refreshes immediately - `role` is left
 * untouched, since the backend's actual authorization decision still comes
 * from the (unchanged, until the next token refresh) JWT, not this response.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: ({ id, values }: UpdateUserVariables) => authApi.updateUser(id, values),
    onSuccess: (updatedUser: AdminUserListItem) => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'users'] });

      if (currentUser && currentUser.id === updatedUser.userId) {
        setUser({
          ...currentUser,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          employeeId: updatedUser.employeeId,
          countryId: updatedUser.countryId,
        });
      }
    },
  });

  return {
    updateUser: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update the user.') : null,
    reset: mutation.reset,
  };
}
