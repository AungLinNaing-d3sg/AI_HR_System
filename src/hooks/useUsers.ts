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
 * (`['auth', 'users', params]`) from the "Add User to Project" combobox's
 * `useUserSearch`/`['auth', 'search-users', ...]`, since the two are backed
 * by different endpoints (`GetUserList` vs `SearchUsers`) with different
 * permissions for different UI.
 *
 * Passing `params.search` switches the same Route Handler over to
 * `GET /Auth/SearchUsers?...&isAllRole=true` instead (see `UsersTable`'s
 * search box) - the returned `users`/`totalCount` then reflect that
 * unpaginated match list rather than the current page.
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
