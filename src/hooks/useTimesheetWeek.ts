'use client';

import { useQuery } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Fetches the combined weekly grid read model. Query key:
 * `['timesheets', 'week', weekStart, periodId ?? null]`. `periodId` (passed
 * through to `getTimesheetWeek`, see its doc comment) pins the response to
 * an explicitly-selected Timesheet Period, e.g. right after the "Timesheet
 * Period" dropdown's `goToPeriod` - omit it for plain week navigation
 * (Previous/Next/This week), which re-derives the covering period from the
 * week's date range instead.
 */
export function useTimesheetWeek(weekStart: string, periodId?: string) {
  const query = useQuery({
    queryKey: ['timesheets', 'week', weekStart, periodId ?? null],
    queryFn: () => (periodId ? timesheetsApi.getTimesheetWeek(weekStart, periodId) : timesheetsApi.getTimesheetWeek(weekStart)),
    enabled: Boolean(weekStart),
  });

  return {
    week: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load the timesheet for this week.') : null,
    refetch: query.refetch,
  };
}
