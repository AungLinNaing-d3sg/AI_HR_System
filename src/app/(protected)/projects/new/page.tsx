import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'New project',
};

/** See `app/(protected)/projects/page.tsx` for why this Server Component independently re-checks the role. */
export default async function NewProjectPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/projects/new');
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">New Project</h1>
        <p className="text-sm text-zinc-500">Create a new client project.</p>
      </header>

      <ProjectForm mode="create" />
    </div>
  );
}
