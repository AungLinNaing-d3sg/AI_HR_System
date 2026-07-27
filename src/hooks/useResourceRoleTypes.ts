'use client';

import { useQuery } from '@tanstack/react-query';
import * as resourceRoleTypesApi from '@/lib/api/resourceRoleTypes.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { ResourceRoleTypeListParams } from '@/lib/api/resourceRoleTypes.api';

/**
 * Fetches the list of resource role types - used both as the assignment role
 * dropdown's reference data (called with no arguments) and, with an explicit
 * `{ pageNo, pageSize }`, as the `/admin/resource-role-types` management
 * table's own server-side paginated data source. Query key:
 * `['resource-role-types', params]`.
 */
export function useResourceRoleTypes(params: ResourceRoleTypeListParams = {}) {
  const query = useQuery({
    queryKey: ['resource-role-types', params],
    queryFn: () => resourceRoleTypesApi.getResourceRoleTypes(params),
  });

  return {
    roleTypes: query.data?.roleTypes ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load resource role types.') : null,
    refetch: query.refetch,
  };
}
