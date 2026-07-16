import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProjectEditPanel } from '@/components/forms/ProjectEditPanel';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Edit project',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** See `app/projects/page.tsx` for why this Server Component independently re-checks the role. */
export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect(`/login?redirect=/projects/${id}`);
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Project</h1>
        <p className="text-sm text-zinc-500">View and update this project&apos;s details.</p>
      </header>

      <ProjectEditPanel id={id} />
    </main>
  );
}
