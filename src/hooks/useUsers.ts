'use client';

import { useQuery } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UsersListParams } from '@/lib/api/auth.api';

/**
 * Lists every user account for the `SystemAdmin`-only `/admin/users`
 * management table, sourced from `GET /Auth/GetUserList` via
 * `app/api/auth/users/route.ts`. `params` drives the table's own
 * server-side pagination (`pageNo`/`pageSize`), falling back to one large
 * page if omitted - see `USERS_PAGE_SIZE`. Distinct query key
 * (`['auth', 'users', params]`) from `useUserList`'s `['auth', 'user-list']`,
 * since the two hit the same backend endpoint with different page
 * sizes/permissions for different UI.
 */
export function useUsers(params: UsersListParams = {}) {
  const query = useQuery({
    queryKey: ['auth', 'users', params],
    queryFn: () => authApi.getUsers(params),
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
