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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Timesheet History</h1>
        <p className="text-sm text-zinc-500">Review logged hours and their approval status.</p>
      </header>

      <TimesheetHistoryTable />
    </div>
  );
}
