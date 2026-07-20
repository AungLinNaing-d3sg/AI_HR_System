import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { TimesheetGrid } from '@/components/tables/TimesheetGrid';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'My Timesheets',
};

/**
 * No extra role gate beyond "authenticated" - see
 * `app/api/timesheets/week/route.ts` for why (every role can log its own
 * hours per `docs/HR_System_BE.postman_collection.json`'s `[Auth]`-only
 * tagging on the Timesheet Entry/Period endpoints).
 */
export default async function TimesheetsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/timesheets');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">My Timesheets</h1>
        <p className="text-sm text-zinc-500">Log your daily hours per project.</p>
      </header>

      <Suspense fallback={null}>
        <TimesheetGrid />
      </Suspense>
    </div>
  );
}
