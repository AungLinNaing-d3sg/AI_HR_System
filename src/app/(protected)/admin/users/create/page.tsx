import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BackLink } from '@/components/common/BackLink';
import { CreateUserForm } from '@/components/forms/CreateUserForm';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Add user',
};

/**
 * `proxy.ts` already redirects non-SystemAdmin/unauthenticated requests
 * away from this route, but per the Next.js Proxy docs a matcher change
 * could silently remove that coverage - so this Server Component
 * independently re-checks the role from the access-token cookie before
 * rendering the form. The `/api/auth/users` Route Handler behind the form
 * performs the same check again, and the backend is the final authority.
 */
export default async function CreateUserPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/admin/users/create');
  }

  if (extractRole(claims) !== 'SystemAdmin') {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-start gap-3">
        <BackLink href="/admin/users" label="Back to Users" />
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Add User</h1>
          <p className="text-sm text-zinc-500">Create a new user account and assign a role.</p>
        </div>
      </header>

      <CreateUserForm />
    </div>
  );
}
