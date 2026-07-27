'use client';

import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination.constants';

export interface UsePaginationOptions {
  initialPageNo?: number;
  initialPageSize?: number;
}

export interface UsePaginationResult {
  pageNo: number;
  pageSize: number;
  /** Jumps to an arbitrary 1-indexed page (clamped to at least 1). */
  goToPage: (pageNo: number) => void;
  /** Changes the page size and resets back to page 1 - a different page size invalidates the current page number. */
  setPageSize: (pageSize: number) => void;
  /** Resets both `pageNo`/`pageSize` back to their initial values - call after a filter change so page 1 is shown. */
  reset: () => void;
}

/**
 * Reusable `pageNo`/`pageSize` state manager for server-side paginated list
 * tables (Countries/Currencies/Exchange Rates/Rate Cards/Resource Role
 * Types/Invoices/Users/Timesheet Report - see `components/common/Pagination.tsx`
 * for the paired UI control). Keeping this state in the table itself (rather
 * than in the data-fetching hook) matches this app's existing container/
 * presentational split: the table owns UI state, the `useXxx` data hook
 * stays a thin `useQuery` wrapper.
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const { initialPageNo = DEFAULT_PAGE_NO, initialPageSize = DEFAULT_PAGE_SIZE } = options;
  const [pageNo, setPageNo] = useState(initialPageNo);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const goToPage = useCallback((next: number) => {
    setPageNo(Math.max(1, Math.trunc(next) || 1));
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(Math.max(1, Math.trunc(next) || 1));
    setPageNo(DEFAULT_PAGE_NO);
  }, []);

  const reset = useCallback(() => {
    setPageNo(initialPageNo);
    setPageSizeState(initialPageSize);
  }, [initialPageNo, initialPageSize]);

  return useMemo(
    () => ({ pageNo, pageSize, goToPage, setPageSize, reset }),
    [pageNo, pageSize, goToPage, setPageSize, reset]
  );
}
