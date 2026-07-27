'use client';

import { useQuery } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Every candidate user for the "Add User to Project" combobox
 * (`UserSearchCombobox`) on `/projects/:id/assignments`, sourced from
 * `GET /Auth/GetUserList` via `GET /api/auth/user-list` (up to
 * `USERS_PAGE_SIZE` accounts). The combobox shows this list as soon as it's
 * focused/opened - before the caller has typed anything - and filters it
 * client-side for a one-character query (below
 * `MIN_USER_SEARCH_QUERY_LENGTH`); once the query is long enough it switches
 * to the server-backed `useUserSearch` instead, which isn't limited to this
 * page. Query key: `['auth', 'user-list']`, shared across every project's
 * assignments panel (not scoped to a project - `GetUserList` returns every
 * account regardless of assignment).
 */
export function useUserList() {
  const query = useQuery({
    queryKey: ['auth', 'user-list'],
    queryFn: () => authApi.getUserList(),
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load candidate users.') : null,
  };
}
