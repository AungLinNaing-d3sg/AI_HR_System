'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as timesheetsApi from '@/lib/api/timesheets.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { TimesheetHistoryParams } from '@/lib/api/timesheets.api';

/**
 * Fetches a page of the `/timesheets/history` table's entries. Query key:
 * `['timesheets', 'history', params]` - mirroring `useTimesheetReport`'s own
 * `pageNo`/`pageSize`-keyed query, so each page is cached independently and
 * flipping back to an already-seen page doesn't refetch it.
 *
 * `placeholderData: keepPreviousData` keeps the *previously rendered* page's
 * rows on screen (instead of `data` momentarily going back to `undefined`)
 * while a new `pageNo`/filter-driven page is in flight - without this, every
 * page turn or filter submit made `TimesheetHistoryTable` briefly unmount its
 * whole stat-cards/filter-bar/table layout down to a single "Loading…" line,
 * which - combined with that line sitting inside the `/timesheets/history`
 * page's `flex-1` content column - collapsed the visible content to a sliver
 * at the top of an otherwise still-viewport-height `<main>`, i.e. exactly the
 * "scrolls down into blank space" bug report: `isLoading` (`isPending`) now
 * only stays `true` for the very first load, `isFetching` covers every
 * subsequent (re)fetch so the caller can keep the previous rows mounted and
 * merely indicate "updating" in place.
 */
export function useTimesheetHistory(params: TimesheetHistoryParams = {}) {
  const query = useQuery({
    queryKey: ['timesheets', 'history', params],
    queryFn: () => timesheetsApi.getTimesheetHistory(params),
    placeholderData: keepPreviousData,
  });

  return {
    entries: query.data?.entries ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load timesheet history.') : null,
    refetch: query.refetch,
  };
}
