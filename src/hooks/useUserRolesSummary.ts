'use client';

import { useQuery } from '@tanstack/react-query';
import * as reportsApi from '@/lib/api/reports.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UserRolesSummaryFilters } from '@/lib/api/reports.api';

/**
 * Fetches the `/reports/roles-summary` summary table's data. Query key:
 * `['reports', 'roles-summary', filters]`.
 */
export function useUserRolesSummary(filters: UserRolesSummaryFilters | null) {
  const query = useQuery({
    queryKey: ['reports', 'roles-summary', filters],
    queryFn: () => reportsApi.getUserRolesSummary(filters as UserRolesSummaryFilters),
    enabled: filters !== null,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not generate the user roles summary.') : null,
    refetch: query.refetch,
  };
}
