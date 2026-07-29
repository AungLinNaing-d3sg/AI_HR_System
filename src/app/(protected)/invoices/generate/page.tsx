import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BackLink } from '@/components/common/BackLink';
import { GenerateInvoiceForm } from '@/components/forms/GenerateInvoiceForm';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Generate Invoice',
};

/** See `app/(protected)/invoices/page.tsx` for why this page is `PROJECT_MANAGEMENT_ROLES`-only. */
export default async function GenerateInvoicePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/invoices/generate');
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-start gap-3">
        <BackLink href="/invoices" label="Back to Invoices" />
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Generate Invoice</h1>
          <p className="text-sm text-zinc-500">Create a new invoice from approved timesheet entries.</p>
        </div>
      </header>

      <GenerateInvoiceForm />
    </div>
  );
}
