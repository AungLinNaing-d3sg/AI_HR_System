'use client';

import { useMutation } from '@tanstack/react-query';
import * as reportsApi from '@/lib/api/reports.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { ReportExportFormat } from '@/lib/constants/report.constants';
import type { MonthlyCostRevenueFilters } from '@/lib/api/reports.api';

/** Downloads the `/reports/cost-revenue` report as an xlsx/csv file for the current filters. */
export function useExportMonthlyCostRevenue() {
  const mutation = useMutation({
    mutationFn: ({ filters, format }: { filters: MonthlyCostRevenueFilters; format: ReportExportFormat }) =>
      reportsApi.exportMonthlyCostRevenue(filters, format),
  });

  return {
    exportReport: (filters: MonthlyCostRevenueFilters, format: ReportExportFormat) =>
      mutation.mutateAsync({ filters, format }),
    isExporting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not export the cost & revenue report.') : null,
    reset: mutation.reset,
  };
}
