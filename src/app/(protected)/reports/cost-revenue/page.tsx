import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BackLink } from '@/components/common/BackLink';
import { CostRevenueTable } from '@/components/tables/CostRevenueTable';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Cost & Revenue Report',
};

/** `/reports/cost-revenue` - KPI cards + cost/revenue table + chart placeholder (`docs/HR_System_FE_wireframe.pdf`). `SystemAdmin`/`ProjectAdmin`-only, see `app/(protected)/reports/page.tsx`. */
export default async function CostRevenueReportPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/reports/cost-revenue');
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-start gap-3">
        <BackLink href="/reports" label="Back to Reports" />
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Cost &amp; Revenue Report</h1>
          <p className="text-sm text-zinc-500">Monthly project cost and revenue using rate cards.</p>
        </div>
      </header>

      <CostRevenueTable />
    </div>
  );
}
