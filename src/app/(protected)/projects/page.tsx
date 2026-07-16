import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProjectsTable } from '@/components/tables/ProjectsTable';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Projects',
};

/**
 * `proxy.ts` already redirects unauthenticated/unauthorized requests away
 * from `/projects` (see its matcher config), but per the Next.js Proxy docs
 * a matcher change could silently remove that coverage - so this Server
 * Component independently re-checks the role from the access-token cookie
 * before rendering. The `/api/projects` Route Handler behind the table
 * performs the same check again, and the backend remains the final
 * authority for anything it does choose to enforce.
 */
export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/projects');
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Projects</h1>
          <p className="text-sm text-zinc-500">Manage all client projects.</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900"
        >
          + New Project
        </Link>
      </header>

      <ProjectsTable />
    </div>
  );
}
