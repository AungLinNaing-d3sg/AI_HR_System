'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getPageNumbers } from '@/lib/utils/pagination';

export interface PaginationProps {
  /** Current 1-indexed page. */
  pageNo: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (pageNo: number) => void;
  /** Disables the Previous/Next controls while a page is being (re)fetched. */
  isLoading?: boolean;
  /** Plural noun shown in the "Showing A-B of N {itemLabel}" summary - defaults to "items". */
  itemLabel?: string;
}

/**
 * Shared server-side pagination control for every paginated list table
 * (Countries/Currencies/Exchange Rates/Rate Cards/Resource Role Types/
 * Invoices/Users/Timesheet Report - see `hooks/usePagination.ts` for the
 * paired state hook). Renders nothing once everything fits on a single page,
 * so a small dataset's table looks exactly as it did before this feature
 * existed.
 *
 * Accessibility: a labelled `<nav>` landmark, an `aria-live` summary so
 * screen reader users hear the updated range after a page change, native
 * `<button>`s (via the shared `Button`) for full keyboard operability, and a
 * clickable, numbered page-button row (`1 2 3 …`, collapsing to `1 … 4 5 6 …
 * 20` once there are too many pages to list in full - see
 * `lib/utils/pagination.ts#getPageNumbers`) between Previous/Next so a page
 * can be jumped to directly instead of only stepping one at a time. The
 * current page's button is marked `aria-current="page"` and disabled (it's
 * already where the user is), Previous/Next disable at the first/last page,
 * and every navigation control disables together while `isLoading` is true
 * so a page can't be double-requested mid-fetch.
 *
 * The `<nav>` is deliberately `relative`: the "Page X of Y" summary below is
 * `sr-only` (Tailwind's visually-hidden utility, which is `position:
 * absolute`), and none of its actual ancestors up to `<body>` set a
 * `position` of their own (see `AppShell`/`layout.tsx`). Without a
 * positioned ancestor nearby, that absolutely-positioned span's containing
 * block falls all the way back to the document's initial containing block
 * (`<html>`) instead of this `<nav>` - which, on a long page (e.g.
 * `/timesheets/history`, where this renders near the bottom, well past one
 * viewport's worth of content), makes the *whole document* grow to fit it.
 * `AppShell` relies on the document itself never scrolling (its own
 * `h-screen overflow-hidden` shell owns exactly one viewport, with the
 * sidebar and `<main>` each scrolling independently inside it) - a taller
 * document defeats that, so the browser scrolls the whole page (sidebar
 * included) instead of just `<main>`/the table. Making `<nav>` `relative`
 * gives the summary a small, local containing block instead, without
 * changing anything visually (`position: relative` with no offsets doesn't
 * move it) or requiring the summary itself to be removed.
 */
export function Pagination({ pageNo, pageSize, totalCount, onPageChange, isLoading, itemLabel = 'items' }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount === 0 || totalPages <= 1) {
    return null;
  }

  const isFirstPage = pageNo <= 1;
  const isLastPage = pageNo >= totalPages;
  const rangeStart = (pageNo - 1) * pageSize + 1;
  const rangeEnd = Math.min(pageNo * pageSize, totalCount);
  const pageTokens = getPageNumbers(pageNo, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="relative flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-1 pt-4 text-sm"
    >
      <p aria-live="polite" className="text-zinc-500">
        Showing <span className="font-medium text-zinc-900">{rangeStart}</span>–
        <span className="font-medium text-zinc-900">{rangeEnd}</span> of{' '}
        <span className="font-medium text-zinc-900">{totalCount}</span> {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageNo - 1)}
          disabled={isFirstPage || isLoading}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Previous
        </Button>

        <ul className="flex items-center gap-1.5">
          {pageTokens.map((token, index) =>
            token === 'ellipsis' ? (
              <li key={`ellipsis-${index}`} aria-hidden="true">
                <span className="px-1.5 text-zinc-400 select-none">&hellip;</span>
              </li>
            ) : (
              <li key={token}>
                <Button
                  type="button"
                  variant={token === pageNo ? 'primary' : 'outline'}
                  size="sm"
                  className="h-8 w-8 px-0"
                  onClick={() => onPageChange(token)}
                  disabled={isLoading || token === pageNo}
                  aria-current={token === pageNo ? 'page' : undefined}
                  aria-label={`Page ${token}`}
                >
                  {token}
                </Button>
              </li>
            )
          )}
        </ul>

        <span className="sr-only" aria-live="polite">
          Page {pageNo} of {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageNo + 1)}
          disabled={isLastPage || isLoading}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
