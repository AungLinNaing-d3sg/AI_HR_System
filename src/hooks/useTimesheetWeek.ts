'use client';

import { useQuery } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches the combined weekly grid read model. Query key: `['timesheets', 'week', weekStart]`. */
export function useTimesheetWeek(weekStart: string) {
  const query = useQuery({
    queryKey: ['timesheets', 'week', weekStart],
    queryFn: () => timesheetsApi.getTimesheetWeek(weekStart),
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
