'use client';

import { useQuery } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Fetches the list of assignable account roles for the Create User `RoleId`
 * dropdown, sourced from `GET /Auth/GetRoles` (see
 * `app/api/auth/roles/route.ts`). Query key: `['auth', 'roles']`.
 */
export function useRoles() {
  const query = useQuery({
    queryKey: ['auth', 'roles'],
    queryFn: () => authApi.getRoles(),
  });

  return {
    roles: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load roles.') : null,
    refetch: query.refetch,
  };
}
