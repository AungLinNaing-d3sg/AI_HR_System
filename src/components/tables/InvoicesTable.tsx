'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { useInvoices } from '@/hooks/useInvoices';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { InvoiceStatusBadge } from '@/components/common/InvoiceStatusBadge';
import { Pagination } from '@/components/common/Pagination';
import { INVOICE_STATUS_LABELS } from '@/lib/constants/invoice.constants';
import { cn } from '@/lib/utils/cn';
import { INVOICE_STATUSES } from '@/types/domain.types';
import type { InvoiceStatus } from '@/types/domain.types';

const ALL_STATUSES = 'all';

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The `/invoices` table (see `docs/HR_System_FE_wireframe.pdf`'s `/invoices`
 * screen): a row of status-count chips (doubling as status filter tabs) and
 * an Invoice #/Project/Client/Billing Period/Amount/Currency/Status/
 * Generated/Actions table with a "View" link per row. The wireframe has no
 * project filter/dropdown on this screen. Status counts are computed from a
 * separate, unfiltered, unpaginated fetch (matching the `INVOICE_LIST_PAGE_SIZE`
 * comment in `invoice.constants.ts`), so the chips stay accurate regardless
 * of which status tab or page is selected; the row table itself is filtered
 * by the selected status and paginated server-side (`pageNo`/`pageSize`).
 */
export function InvoicesTable() {
  const [statusFilter, setStatusFilter] = useState<typeof ALL_STATUSES | InvoiceStatus>(ALL_STATUSES);

  const { invoices: allInvoices, isLoading: isLoadingCounts } = useInvoices();

  const { pageNo, pageSize, goToPage } = usePagination();
  const {
    invoices,
    totalCount,
    isLoading: isLoadingPage,
    isError,
    error,
    refetch,
  } = useInvoices({ status: statusFilter === ALL_STATUSES ? undefined : statusFilter, pageNo, pageSize });

  const statusCounts = useMemo(() => {
    const counts: Record<InvoiceStatus, number> = { Draft: 0, Sent: 0, Paid: 0, Void: 0, Cancelled: 0 };
    for (const invoice of allInvoices) {
      counts[invoice.status] += 1;
    }
    return counts;
  }, [allInvoices]);

  const isLoading = isLoadingCounts || isLoadingPage;

  const handleSelectStatus = (status: typeof ALL_STATUSES | InvoiceStatus) => {
    setStatusFilter(status);
    goToPage(1);
  };

  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading invoices…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error ?? 'Could not load invoices.'}</Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter invoices by status">
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === ALL_STATUSES}
          onClick={() => handleSelectStatus(ALL_STATUSES)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900',
            statusFilter === ALL_STATUSES
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
          )}
        >
          All
          <span className="rounded-full bg-white/20 px-1.5 py-px text-[10px]">{allInvoices.length}</span>
        </button>
        {INVOICE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={statusFilter === status}
            onClick={() => handleSelectStatus(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900',
              statusFilter === status
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            )}
          >
            {INVOICE_STATUS_LABELS[status]}
            <span className="rounded-full bg-zinc-900/10 px-1.5 py-px text-[10px] text-zinc-700">
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {allInvoices.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No invoices yet.</p>
          <Link
            href="/invoices/generate"
            className="mt-2 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
          >
            Generate your first invoice
          </Link>
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No invoices match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">List of client invoices with their status and billing details.</caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Invoice #
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Project
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Billing period
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Currency
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Generated
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    <span className="font-medium text-zinc-900">{invoice.project.name}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{invoice.clientName}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(invoice.billingPeriodStart)} – {formatDate(invoice.billingPeriodEnd)}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{formatAmount(invoice.totalAmount)}</td>
                  <td className="px-4 py-3 text-zinc-600">{invoice.currency.code}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDate(invoice.issuedDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pageNo={pageNo}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={goToPage}
        isLoading={isLoadingPage}
        itemLabel="invoices"
      />
    </div>
  );
}
