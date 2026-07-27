import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { InvoicesTable } from '@/components/tables/InvoicesTable';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { PROJECT_MANAGEMENT_ROLES } from '@/lib/constants/project.constants';
import { decodeAccessToken, extractRole, isTokenExpired } from '@/lib/utils/jwt';

export const metadata = {
  title: 'Invoices',
};

/**
 * `/invoices` (`docs/HR_System_FE_wireframe.pdf`): status-count chips, an
 * invoice table, and a "Generate Invoice" action. `SystemAdmin`/
 * `ProjectAdmin`-only, matching every `/api/invoices/*` Route Handler's own
 * gate (see `app/api/invoices/route.ts`) - billing/financial data is a
 * management operation, not something a plain `User` needs.
 */
export default async function InvoicesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    redirect('/login?redirect=/invoices');
  }

  const role = extractRole(claims);
  if (!role || !PROJECT_MANAGEMENT_ROLES.includes(role)) {
    redirect('/forbidden');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Invoices</h1>
          <p className="text-sm text-zinc-500">Manage and track all client invoices.</p>
        </div>
        <Link
          href="/invoices/generate"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Generate Invoice
        </Link>
      </header>

      <InvoicesTable />
    </div>
  );
}
