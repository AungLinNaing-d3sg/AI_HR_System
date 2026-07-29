'use client';

import { useQuery } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Lists all timesheet periods, newest first. Query key: `['timesheets', 'periods']`. */
export function useTimesheetPeriods() {
  const query = useQuery({
    queryKey: ['timesheets', 'periods'],
    queryFn: timesheetsApi.getTimesheetPeriods,
  });

  return {
    periods: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load timesheet periods.') : null,
    refetch: query.refetch,
  };
}
