import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BackLink } from '@/components/common/BackLink';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'New project',
};

/** See `app/(protected)/projects/page.tsx` for why this Server Component independently re-checks the token. */
export default async function NewProjectPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/projects/new');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-start gap-3">
        <BackLink href="/projects" label="Back to Projects" />
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">New Project</h1>
          <p className="text-sm text-zinc-500">Create a new client project.</p>
        </div>
      </header>

      <ProjectForm mode="create" />
    </div>
  );
}
