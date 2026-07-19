import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardGreeting } from '@/components/common/DashboardGreeting';
import { DashboardOverview } from '@/components/common/DashboardOverview';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Dashboard',
};

/** See `app/(protected)/projects/page.tsx` for why this Server Component independently re-checks the token. */
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/dashboard');
  }

  const role = extractRole(claims);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <DashboardGreeting />
        <p className="text-sm text-zinc-500">Here&apos;s what&apos;s happening with your projects today.</p>
      </header>

      <DashboardOverview role={role} />
    </div>
  );
}
