'use client';

import { useMutation } from '@tanstack/react-query';
import * as reportsApi from '@/lib/api/reports.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { ReportExportFormat } from '@/lib/constants/report.constants';
import type { UserRolesSummaryFilters } from '@/lib/api/reports.api';

/** Downloads the `/reports/roles-summary` report as an xlsx/csv file for the current filters. */
export function useExportUserRolesSummary() {
  const mutation = useMutation({
    mutationFn: ({ filters, format }: { filters: UserRolesSummaryFilters; format: ReportExportFormat }) =>
      reportsApi.exportUserRolesSummary(filters, format),
  });

  return {
    exportReport: (filters: UserRolesSummaryFilters, format: ReportExportFormat) =>
      mutation.mutateAsync({ filters, format }),
    isExporting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not export the user roles summary.') : null,
    reset: mutation.reset,
  };
}
