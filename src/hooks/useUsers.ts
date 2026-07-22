'use client';

import { useQuery } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Lists every user account for the `SystemAdmin`-only `/admin/users`
 * management table, sourced from `GET /Auth/GetUserList` via
 * `app/api/auth/users/route.ts` (a large, single page - see
 * `USERS_PAGE_SIZE`). Distinct query key (`['auth', 'users']`) from
 * `useUserList`'s `['auth', 'user-list']`, since the two hit the same
 * backend endpoint with different page sizes/permissions for different UI.
 */
export function useUsers() {
  const query = useQuery({
    queryKey: ['auth', 'users'],
    queryFn: authApi.getUsers,
  });

  return {
    users: query.data?.users ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load users.') : null,
    refetch: query.refetch,
  };
}
