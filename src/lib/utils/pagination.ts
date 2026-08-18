import { paginationQuerySchema } from '@/lib/validators/pagination.validators';

export interface ResolvedPagination {
  pageNo: number;
  pageSize: number;
}

/**
 * Reads and validates the optional `pageNo`/`pageSize` query params off a
 * paginated list Route Handler's `URLSearchParams` (see
 * `paginationQuerySchema`), falling back to `defaults` for anything absent
 * or invalid. Used by every paginated list Route Handler (`/api/countries`,
 * `/api/currencies`, `/api/exchange-rates`, `/api/rate-cards`,
 * `/api/resource-role-types`, `/api/invoices`, `/api/auth/users`,
 * `/api/reports/timesheet`) so a malformed value (e.g. a tampered URL)
 * degrades to that route's own default page instead of failing the whole
 * request - pagination position isn't security- or data-integrity-sensitive
 * the way a mutation's request body is.
 */
export function resolvePagination(searchParams: URLSearchParams, defaults: ResolvedPagination): ResolvedPagination {
  const parsed = paginationQuerySchema.safeParse({
    pageNo: searchParams.get('pageNo') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });

  if (!parsed.success) {
    return defaults;
  }

  return {
    pageNo: parsed.data.pageNo ?? defaults.pageNo,
    pageSize: parsed.data.pageSize ?? defaults.pageSize,
  };
}

/** A single token in a page-number sequence: either a real 1-indexed page, or a collapsed run of skipped pages. */
export type PageToken = number | 'ellipsis';

/**
 * Computes the compact, clickable page-number sequence for the shared
 * `Pagination` control's numbered page-button row (e.g. `1 … 4 5 6 … 20`),
 * following the common "sibling + boundary" windowing pattern: always keep
 * the first and last page visible, plus the current page and `siblingCount`
 * pages either side of it, collapsing any remaining gap into a single
 * `'ellipsis'` token instead of listing every skipped page number. Returns
 * every page (no ellipsis) once `totalPages` is small enough to fit without
 * collapsing anything.
 */
export function getPageNumbers(pageNo: number, totalPages: number, siblingCount = 1): PageToken[] {
  const safeTotalPages = Math.max(1, Math.trunc(totalPages) || 1);
  const safePageNo = Math.min(Math.max(1, Math.trunc(pageNo) || 1), safeTotalPages);

  // first page + last page + current page + 2 siblings + 2 possible ellipses.
  const totalSlots = siblingCount * 2 + 5;

  if (safeTotalPages <= totalSlots) {
    return Array.from({ length: safeTotalPages }, (_, index) => index + 1);
  }

  const leftSiblingIndex = Math.max(safePageNo - siblingCount, 1);
  const rightSiblingIndex = Math.min(safePageNo + siblingCount, safeTotalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < safeTotalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + siblingCount * 2;
    const leftRange = Array.from({ length: leftItemCount }, (_, index) => index + 1);
    return [...leftRange, 'ellipsis', safeTotalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + siblingCount * 2;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, index) => safeTotalPages - rightItemCount + index + 1
    );
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, index) => leftSiblingIndex + index
  );
  return [1, 'ellipsis', ...middleRange, 'ellipsis', safeTotalPages];
}
