'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Ban, Download, Pencil, Printer, Send, Trash2, XCircle } from 'lucide-react';
import { useCancelInvoice } from '@/hooks/useCancelInvoice';
import { useDeleteInvoice } from '@/hooks/useDeleteInvoice';
import { useDownloadInvoicePdf } from '@/hooks/useDownloadInvoicePdf';
import { useInvoice } from '@/hooks/useInvoice';
import { useMarkInvoicePaid } from '@/hooks/useMarkInvoicePaid';
import { useSendInvoice } from '@/hooks/useSendInvoice';
import { useVoidInvoice } from '@/hooks/useVoidInvoice';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { InvoiceEditForm } from '@/components/forms/InvoiceEditForm';
import { InvoiceStatusBadge } from '@/components/common/InvoiceStatusBadge';
import { INVOICING_COMPANY } from '@/lib/constants/invoice.constants';
import type { InvoiceDetail } from '@/types/domain.types';

type PendingAction = 'send' | 'markPaid' | 'void' | 'cancel' | 'delete';

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatMoney(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ActionConfig {
  title: string;
  description: string;
  confirmLabel: string;
}

const ACTION_CONFIG: Record<PendingAction, (invoice: InvoiceDetail) => ActionConfig> = {
  send: (invoice) => ({
    title: 'Send invoice',
    description: `Send "${invoice.invoiceNumber}" to the client? This transitions it from Draft to Sent and it can no longer be edited or deleted.`,
    confirmLabel: 'Send',
  }),
  markPaid: (invoice) => ({
    title: 'Mark invoice as paid',
    description: `Mark "${invoice.invoiceNumber}" as Paid? Use this once payment has been received from the client.`,
    confirmLabel: 'Mark as Paid',
  }),
  void: (invoice) => ({
    title: 'Void invoice',
    description: `Void "${invoice.invoiceNumber}"? This is typically used to correct an invoice issued in error. This cannot be undone.`,
    confirmLabel: 'Void',
  }),
  cancel: (invoice) => ({
    title: 'Cancel invoice',
    description: `Cancel "${invoice.invoiceNumber}"? This cannot be undone.`,
    confirmLabel: 'Cancel invoice',
  }),
  delete: (invoice) => ({
    title: 'Delete invoice',
    description: `Are you sure you want to delete "${invoice.invoiceNumber}"? This cannot be undone.`,
    confirmLabel: 'Delete',
  }),
};

/**
 * View/Edit/status-management panel for a single invoice (`/invoices/[id]`,
 * see `docs/HR_System_FE_wireframe.pdf`). Fetches the invoice client-side via
 * `useInvoice` (loading/error/not-found states handled here), renders the
 * printable invoice document (dark header, bill-to/payment details, line
 * items, totals - matching the wireframe's HTML invoice preview), and
 * exposes the full status lifecycle documented for `/Invoice/*` in
 * docs/HR_System_BE.postman_collection.json: `Edit`/`Send Invoice`/`Delete`
 * on a Draft invoice, `Mark as Paid` on a Sent invoice, and `Void`/`Cancel`
 * on either (both apply "regardless of current status" per the backend, but
 * this app only surfaces them while the invoice is still Draft/Sent - a
 * Paid/Void/Cancelled invoice is treated as terminal in this UI).
 *
 * The line items table shows a "Description" column (the timesheet task
 * description) rather than the wireframe mockup's per-line "Date" column -
 * `GetInvoiceById`'s real `LineItems` DTO has no per-line entry date field
 * (only an aggregate `BillingPeriodStart`/`BillingPeriodEnd`), so this app
 * shows the field it actually has instead of fabricating one.
 */
export function InvoiceDetailPanel({ id }: { id: string }) {
  const router = useRouter();
  const { invoice, isLoading, isError, error } = useInvoice(id);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const { sendInvoice, isSending, error: sendError, reset: resetSendError } = useSendInvoice();
  const { markInvoicePaid, isMarkingPaid, error: markPaidError, reset: resetMarkPaidError } = useMarkInvoicePaid();
  const { voidInvoice, isVoiding, error: voidError, reset: resetVoidError } = useVoidInvoice();
  const { cancelInvoice, isCancelling, error: cancelError, reset: resetCancelError } = useCancelInvoice();
  const { deleteInvoice, isDeleting, error: deleteError, reset: resetDeleteError } = useDeleteInvoice();
  const { downloadInvoicePdf, isDownloading, error: downloadError, reset: resetDownloadError } =
    useDownloadInvoicePdf();

  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading invoice…
      </p>
    );
  }

  if (isError || !invoice) {
    return <Alert variant="error">{error ?? 'This invoice could not be found.'}</Alert>;
  }

  const isConfirming =
    pendingAction === 'send'
      ? isSending
      : pendingAction === 'markPaid'
        ? isMarkingPaid
        : pendingAction === 'void'
          ? isVoiding
          : pendingAction === 'cancel'
            ? isCancelling
            : isDeleting;

  const actionError = sendError ?? markPaidError ?? voidError ?? cancelError ?? deleteError ?? downloadError;

  const openConfirm = (action: PendingAction) => {
    resetSendError();
    resetMarkPaidError();
    resetVoidError();
    resetCancelError();
    resetDeleteError();
    setPendingAction(action);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    try {
      switch (pendingAction) {
        case 'send':
          await sendInvoice(invoice.id);
          break;
        case 'markPaid':
          await markInvoicePaid(invoice.id);
          break;
        case 'void':
          await voidInvoice(invoice.id);
          break;
        case 'cancel':
          await cancelInvoice(invoice.id);
          break;
        case 'delete':
          await deleteInvoice(invoice.id);
          router.push('/invoices');
          return;
      }
      setPendingAction(null);
    } catch {
      // Surfaced via `actionError` above; keep the dialog open so the user can retry or cancel.
    }
  };

  const handleDownload = async () => {
    resetDownloadError();
    try {
      await downloadInvoicePdf({ id: invoice.id, invoiceNumber: invoice.invoiceNumber });
    } catch {
      // Surfaced via `actionError` above.
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (isEditing) {
    return (
      <InvoiceEditForm
        invoice={invoice}
        onCancel={() => setIsEditing(false)}
        onSaved={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          Print
        </Button>
        <Button type="button" variant="outline" size="sm" isLoading={isDownloading} onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {isDownloading ? 'Downloading…' : 'Download PDF'}
        </Button>

        {invoice.status === 'Draft' && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
            <Button type="button" size="sm" onClick={() => openConfirm('send')}>
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Send Invoice
            </Button>
          </>
        )}

        {invoice.status === 'Sent' && (
          <Button type="button" size="sm" onClick={() => openConfirm('markPaid')}>
            Mark as Paid
          </Button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(invoice.status === 'Draft' || invoice.status === 'Sent') && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => openConfirm('void')}
              >
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                Void
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => openConfirm('cancel')}
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </Button>
            </>
          )}
          {invoice.status === 'Draft' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => openConfirm('delete')}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-t-lg bg-zinc-900 px-6 py-6 text-white print:rounded-none">
          <div>
            <p className="text-lg font-semibold">{INVOICING_COMPANY.name}</p>
            {INVOICING_COMPANY.addressLines.map((line) => (
              <p key={line} className="text-sm text-zinc-300">
                {line}
              </p>
            ))}
            <p className="text-sm text-zinc-300">
              {INVOICING_COMPANY.email} &middot; {INVOICING_COMPANY.phone}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Invoice</p>
            <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
            <p className="text-sm text-zinc-300">Date: {formatDate(invoice.issuedDate)}</p>
            <p className="text-sm text-zinc-300">
              Period: {formatDate(invoice.billingPeriodStart)} – {formatDate(invoice.billingPeriodEnd)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-b border-zinc-200 p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">Bill To</p>
            <p className="text-sm font-medium text-zinc-900">{invoice.clientName}</p>
            <p className="text-sm text-zinc-600">{invoice.project.name}</p>
            {invoice.clientEmail && <p className="text-sm text-zinc-600">{invoice.clientEmail}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase text-zinc-500">Payment Details</p>
            <p className="text-sm text-zinc-600">Currency: {invoice.currency.code}</p>
            <p className="text-sm text-zinc-600">Due date: {formatDate(invoice.dueDate)}</p>
            <div className="mt-1 sm:flex sm:justify-end">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="p-6">
          {invoice.lineItems.length === 0 ? (
            <p className="text-sm text-zinc-500">No line items on this invoice.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-zinc-200">
              <table className="w-full min-w-max text-left text-sm">
                <caption className="sr-only">Invoice line items with hours, rate, and amount per resource.</caption>
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Resource
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Description
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Hours
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Rate
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-zinc-900">{item.user.fullName}</td>
                      <td className="px-4 py-3 text-zinc-600">{item.resourceRoleType.name}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-zinc-600">{item.description || '—'}</td>
                      <td className="px-4 py-3 text-zinc-600">{item.hours}h</td>
                      <td className="px-4 py-3 text-zinc-600">{formatMoney(item.unitRate, invoice.currency.symbol)}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {formatMoney(item.amount, invoice.currency.symbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <dl className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd className="text-zinc-900">{formatMoney(invoice.subTotal, invoice.currency.symbol)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Tax</dt>
                <dd className="text-zinc-900">{formatMoney(invoice.taxAmount, invoice.currency.symbol)}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1 text-base font-semibold text-zinc-900">
                <dt>Total</dt>
                <dd>{formatMoney(invoice.totalAmount, invoice.currency.symbol)}</dd>
              </div>
            </dl>
          </div>

          {invoice.notes && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase text-zinc-500">Notes</p>
              <p className="whitespace-pre-wrap text-sm text-zinc-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction ? ACTION_CONFIG[pendingAction](invoice).title : ''}
        description={pendingAction ? ACTION_CONFIG[pendingAction](invoice).description : ''}
        confirmLabel={pendingAction ? ACTION_CONFIG[pendingAction](invoice).confirmLabel : 'Confirm'}
        isConfirming={isConfirming}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
