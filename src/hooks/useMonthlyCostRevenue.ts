'use client';

import { useQuery } from '@tanstack/react-query';
import * as reportsApi from '@/lib/api/reports.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { MonthlyCostRevenueFilters } from '@/lib/api/reports.api';

/**
 * Fetches the `/reports/cost-revenue` KPI cards + table's data. Query key:
 * `['reports', 'cost-revenue', filters]`.
 */
export function useMonthlyCostRevenue(filters: MonthlyCostRevenueFilters | null) {
  const query = useQuery({
    queryKey: ['reports', 'cost-revenue', filters],
    queryFn: () => reportsApi.getMonthlyCostRevenue(filters as MonthlyCostRevenueFilters),
    enabled: filters !== null,
  });

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not generate the cost & revenue report.') : null,
    refetch: query.refetch,
  };
}
