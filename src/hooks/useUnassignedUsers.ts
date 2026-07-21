'use client';

import { useQuery } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Fetches candidate users for the "Add User to Project" dropdown on
 * `/projects/:id/assignments` - every user with no current project
 * assignment, sourced from `GET /Auth/GetUnassignedUsers` (see
 * `app/api/auth/unassigned-users/route.ts`). Global (not scoped to a single
 * project), so the query key is a flat `['auth', 'unassigned-users']` tuple
 * shared across every project's assignments panel.
 */
export function useUnassignedUsers() {
  const query = useQuery({
    queryKey: ['auth', 'unassigned-users'],
    queryFn: () => authApi.getUnassignedUsers(),
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load candidate users.') : null,
    refetch: query.refetch,
  };
}
