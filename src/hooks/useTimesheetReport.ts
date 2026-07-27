'use client';

import { useQuery } from '@tanstack/react-query';
import * as reportsApi from '@/lib/api/reports.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { TimesheetReportFilters } from '@/lib/api/reports.api';

/**
 * Fetches the `/reports/timesheet` data table's report. Query key:
 * `['reports', 'timesheet', filters]`. `filters` is `null` until the page
 * has computed its default date range, mirroring `useTimesheetWeek`'s
 * `enabled: Boolean(weekStart)` pattern.
 */
export function useTimesheetReport(filters: TimesheetReportFilters | null) {
  const query = useQuery({
    queryKey: ['reports', 'timesheet', filters],
    queryFn: () => reportsApi.getTimesheetReport(filters as TimesheetReportFilters),
    enabled: filters !== null,
  });

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not generate the timesheet report.') : null,
    refetch: query.refetch,
  };
}
