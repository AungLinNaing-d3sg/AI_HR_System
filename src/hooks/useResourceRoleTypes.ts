'use client';

import { useQuery } from '@tanstack/react-query';
import * as resourceRoleTypesApi from '@/lib/api/resourceRoleTypes.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches the list of resource role types for the assignment role dropdown. Query key: `['resource-role-types']`. */
export function useResourceRoleTypes() {
  const query = useQuery({
    queryKey: ['resource-role-types'],
    queryFn: () => resourceRoleTypesApi.getResourceRoleTypes(),
  });

  return {
    roleTypes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load resource role types.') : null,
    refetch: query.refetch,
  };
}
