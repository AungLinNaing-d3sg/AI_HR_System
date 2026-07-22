'use client';

import { useQuery } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Fetches candidate users for the "Add User to Project" dropdown on
 * `/projects/:id/assignments` - the first page of the paginated user list,
 * sourced from `GET /Auth/GetUserList?pageNo=1&pageSize=10` (see
 * `app/api/auth/user-list/route.ts`), replacing the previously used
 * `GET /Auth/GetUnassignedUsers`. Global (not scoped to a single project),
 * so the query key is a flat `['auth', 'user-list']` tuple shared across
 * every project's assignments panel.
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
    refetch: query.refetch,
  };
}
