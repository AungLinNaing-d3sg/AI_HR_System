'use client';

import { useMutation } from '@tanstack/react-query';
import * as reportsApi from '@/lib/api/reports.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { ReportExportFormat } from '@/lib/constants/report.constants';
import type { TimesheetReportFilters } from '@/lib/api/reports.api';

/** Downloads the `/reports/timesheet` report as an xlsx/csv file for the current filters. */
export function useExportTimesheetReport() {
  const mutation = useMutation({
    mutationFn: ({ filters, format }: { filters: TimesheetReportFilters; format: ReportExportFormat }) =>
      reportsApi.exportTimesheetReport(filters, format),
  });

  return {
    exportReport: (filters: TimesheetReportFilters, format: ReportExportFormat) =>
      mutation.mutateAsync({ filters, format }),
    isExporting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not export the timesheet report.') : null,
    reset: mutation.reset,
  };
}
