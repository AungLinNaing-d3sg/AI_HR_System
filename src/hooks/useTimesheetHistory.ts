'use client';

import { useQuery } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { TimesheetHistoryParams } from '@/lib/api/timesheets.api';

/**
 * Fetches a page of the `/timesheets/history` table's entries. Query key:
 * `['timesheets', 'history', params]` - mirroring `useTimesheetReport`'s own
 * `pageNo`/`pageSize`-keyed query, so each page is cached independently and
 * flipping back to an already-seen page doesn't refetch it.
 */
export function useTimesheetHistory(params: TimesheetHistoryParams = {}) {
  const query = useQuery({
    queryKey: ['timesheets', 'history', params],
    queryFn: () => timesheetsApi.getTimesheetHistory(params),
  });

  return {
    entries: query.data?.entries ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load timesheet history.') : null,
    refetch: query.refetch,
  };
}
