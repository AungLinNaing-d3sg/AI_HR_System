import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardGreeting } from '@/components/common/DashboardGreeting';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
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
        <p className="text-sm text-zinc-500">Here&apos;s a quick jump to what you can manage today.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {role && PROJECT_MANAGEMENT_ROLES.includes(role) && (
          <Link
            href="/projects"
            className="rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <p className="text-sm font-semibold text-zinc-900">Projects</p>
            <p className="mt-1 text-sm text-zinc-500">Manage all client projects.</p>
          </Link>
        )}

        {role === 'SystemAdmin' && (
          <Link
            href="/admin/users/create"
            className="rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <p className="text-sm font-semibold text-zinc-900">Create user</p>
            <p className="mt-1 text-sm text-zinc-500">Add a new user account.</p>
          </Link>
        )}

        <Link
          href="/profile"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          <p className="text-sm font-semibold text-zinc-900">My account</p>
          <p className="mt-1 text-sm text-zinc-500">View and update your profile.</p>
        </Link>
      </div>
    </div>
  );
}
