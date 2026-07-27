import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DollarSign, FileText, Users } from 'lucide-react';
import { ReportCard } from '@/components/common/ReportCard';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Reports',
};

/**
 * `/reports` hub (`docs/HR_System_FE_wireframe.pdf`): three clickable report
 * cards. `SystemAdmin`/`ProjectAdmin`-only, matching every `/api/reports/*`
 * Route Handler's own gate (see `app/api/reports/timesheet/route.ts`) - a
 * plain `User` has no reason to see every user's/project's timesheet and
 * financial data.
 */
export default async function ReportsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/reports');
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500">Generate and export reports across timesheets, roles, and financials.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          href="/reports/timesheet"
          icon={FileText}
          iconClassName="bg-blue-100 text-blue-700"
          title="Timesheet Report"
          description="View detailed timesheet entries by project, user, and date range. Export to CSV or Excel."
          tags={['Hours', 'Projects', 'Users']}
        />
        <ReportCard
          href="/reports/roles-summary"
          icon={Users}
          iconClassName="bg-purple-100 text-purple-700"
          title="User Roles Summary"
          description="Summarize total hours grouped by user role. Understand capacity and utilization at a glance."
          tags={['Roles', 'Utilization', 'Hours']}
        />
        <ReportCard
          href="/reports/cost-revenue"
          icon={DollarSign}
          iconClassName="bg-green-100 text-green-700"
          title="Cost & Revenue Report"
          description="Monthly breakdown of project costs and revenues using rate cards. Compare across projects."
          tags={['Cost', 'Revenue', 'Rate Cards']}
        />
      </div>
    </div>
  );
}
