'use client';

import { useQuery } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches the `/timesheets/history` table's entries. Query key: `['timesheets', 'history']`. */
export function useTimesheetHistory() {
  const query = useQuery({
    queryKey: ['timesheets', 'history'],
    queryFn: () => timesheetsApi.getTimesheetHistory(),
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load timesheet history.') : null,
    refetch: query.refetch,
  };
}
