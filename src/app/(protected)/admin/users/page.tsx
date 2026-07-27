import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { UsersTable } from '@/components/tables/UsersTable';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'User management',
};

/**
 * `proxy.ts` already redirects non-SystemAdmin/unauthenticated requests
 * away from this route (`SYSTEM_ADMIN_ONLY_ROUTES`), but per the Next.js
 * Proxy docs a matcher change could silently remove that coverage - so this
 * Server Component independently re-checks the role from the access-token
 * cookie before rendering, mirroring `admin/users/create/page.tsx`. The
 * `/api/auth/users` Route Handler behind `UsersTable` performs the same
 * check again, and the backend is the final authority.
 */
export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/admin/users');
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">User Management</h1>
          <p className="text-sm text-zinc-500">Manage all user accounts and roles.</p>
        </div>
        <Link
          href="/admin/users/create"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add User
        </Link>
      </header>

      <UsersTable />
    </div>
  );
}
