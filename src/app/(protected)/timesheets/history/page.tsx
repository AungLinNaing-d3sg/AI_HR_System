import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TimesheetHistoryTable } from '@/components/tables/TimesheetHistoryTable';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Timesheet History',
};

/**
 * No extra role gate beyond "authenticated" - `TimesheetHistoryTable`/
 * `GET /api/timesheets/history` scope which rows are visible and whether
 * the Approve action appears, mirroring `/timesheets` (see
 * `app/api/timesheets/week/route.ts` for why).
 */
export default async function TimesheetHistoryPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/timesheets/history');
  }

  return (
    // `min-h-0 overflow-y-auto` (paired with the `flex-1` this already had)
    // makes this page's own content box - not `AppShell`'s `<main>` - the
    // single scroll container for everything below it: the heading, the
    // stat cards, the filter bar, the table, *and* the pagination control
    // all scroll together as one region. Without `min-h-0`, a flex item's
    // automatic minimum height defaults to its content size, so once the
    // numbered-page-button `Pagination` upgrade made this page's total
    // content taller than the viewport, this `<div>` grew past `<main>`'s
    // bounds instead of scrolling internally - `<main>`'s own
    // `overflow-y-auto` then kicked in as a second, redundant ("outer")
    // scrollbar on top of it. Capping this `<div>` to `<main>`'s available
    // height and letting it own the scroll instead keeps exactly one
    // scrollbar for the whole page, matching the wireframe/UX intent that
    // pagination stays reachable by scrolling the page, not a separate
    // table-only scroll region.
    <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-10 sm:px-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold text-zinc-900">Timesheet History</h1>
        <p className="text-sm text-zinc-500">View all past timesheet entries.</p>
      </header>

      <TimesheetHistoryTable />
    </div>
  );
}
