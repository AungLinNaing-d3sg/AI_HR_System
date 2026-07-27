import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProjectAssignmentsPanel } from '@/components/forms/ProjectAssignmentsPanel';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { decodeAccessToken, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Project Assignments',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** See `app/(protected)/projects/page.tsx` for why this Server Component independently re-checks the token. */
export default async function ProjectAssignmentsPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect(`/login?redirect=/projects/${id}/assignments`);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <ProjectAssignmentsPanel projectId={id} />
    </div>
  );
}
