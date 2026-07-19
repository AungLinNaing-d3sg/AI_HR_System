'use client';

import { useQuery } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Fetches candidate users for the "unassigned users" dropdown. Query key:
 * `['projects', projectId, 'unassigned-users']` - see
 * `app/api/projects/[id]/unassigned-users/route.ts` for how this list is
 * derived (there's no backend endpoint that lists every user).
 */
export function useUnassignedUsers(projectId: string) {
  const query = useQuery({
    queryKey: ['projects', projectId, 'unassigned-users'],
    queryFn: () => projectsApi.getUnassignedUsers(projectId),
    enabled: Boolean(projectId),
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load candidate users.') : null,
    refetch: query.refetch,
  };
}
