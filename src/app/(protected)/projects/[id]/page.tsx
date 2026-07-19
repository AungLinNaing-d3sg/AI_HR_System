import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BackLink } from '@/components/common/BackLink';
import { ProjectEditPanel } from '@/components/forms/ProjectEditPanel';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Edit project',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** See `app/(protected)/projects/page.tsx` for why this Server Component independently re-checks the token. */
export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect(`/login?redirect=/projects/${id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-start gap-3">
        <BackLink href="/projects" label="Back to Projects" />
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Project</h1>
      </header>

      <ProjectEditPanel id={id} />
    </div>
  );
}
