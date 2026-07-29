import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BackLink } from '@/components/common/BackLink';
import { InvoiceDetailPanel } from '@/components/common/InvoiceDetailPanel';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Invoice',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/** See `app/(protected)/invoices/page.tsx` for why this page is `PROJECT_MANAGEMENT_ROLES`-only. */
export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect(`/login?redirect=/invoices/${id}`);
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 print:max-w-none print:px-0 print:py-0">
      <header className="flex items-start gap-3 print:hidden">
        <BackLink href="/invoices" label="Back to Invoices" />
        <h1 className="text-2xl font-semibold text-zinc-900">Invoice</h1>
      </header>

      <InvoiceDetailPanel id={id} />
    </div>
  );
}
