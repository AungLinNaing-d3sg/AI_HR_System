import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ProjectsTable } from '@/components/tables/ProjectsTable';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Projects',
};

/**
 * `proxy.ts` already redirects unauthenticated requests away from
 * `/projects` (see its matcher config), but per the Next.js Proxy docs a
 * matcher change could silently remove that coverage - so this Server
 * Component independently re-checks the token before rendering. Projects is
 * open to every authenticated role (see `project.constants.ts`).
 */
export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/projects');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Projects</h1>
          <p className="text-sm text-zinc-500">Manage all client projects and assignments.</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Project
        </Link>
      </header>

      <ProjectsTable />
    </div>
  );
}
