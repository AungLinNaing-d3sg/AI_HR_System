import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TimesheetPeriodForm } from '@/components/forms/TimesheetPeriodForm';
import { TimesheetPeriodsTable } from '@/components/tables/TimesheetPeriodsTable';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Timesheet Periods',
};

/**
 * `SystemAdmin`/`ProjectAdmin`-only - see `app/api/timesheets/periods/route.ts`
 * for why. This Server Component independently re-checks the role from the
 * access-token cookie before rendering, matching `app/(protected)/projects/page.tsx`.
 */
export default async function TimesheetPeriodsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/timesheets/periods');
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Timesheet Periods</h1>
        <p className="text-sm text-zinc-500">Create payroll periods so users can log hours against them.</p>
      </header>

      <TimesheetPeriodForm />
      <TimesheetPeriodsTable />
    </div>
  );
}
