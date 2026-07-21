import type { InvoiceStatus } from '@/types/domain.types';

/**
 * Invoice-domain constants shared between Route Handlers, the client API
 * module, and the `/invoices*` UI. Mirrors the real lifecycle documented for
 * `/Invoice/*` in docs/HR_System_BE.postman_collection.json.
 */

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  Draft: 'Draft',
  Sent: 'Sent',
  Paid: 'Paid',
  Void: 'Void',
  Cancelled: 'Cancelled',
};

/** Badge color per status, following this app's existing status-chip convention (see `ProjectsTable`/`TimesheetPeriodsTable`). */
export const INVOICE_STATUS_BADGE_CLASSNAMES: Record<InvoiceStatus, string> = {
  Draft: 'bg-amber-100 text-amber-800',
  Sent: 'bg-blue-100 text-blue-800',
  Paid: 'bg-green-100 text-green-800',
  Void: 'bg-zinc-200 text-zinc-700',
  Cancelled: 'bg-red-100 text-red-800',
};

/**
 * `GetAllInvoices` is paginated (`Page`/`PageSize`), but the wireframe's
 * `/invoices` screen (`docs/HR_System_FE_wireframe.pdf`) shows a plain,
 * unpaginated table - so, matching the same choice already made for the
 * Report domain (see `REPORT_PAGE_SIZE` in `report.constants.ts`), this app
 * always requests one large page and derives the status-count chips/filter
 * client-side instead of building pagination UI the design doesn't call for.
 */
export const INVOICE_LIST_PAGE_SIZE = 200;

/**
 * Static issuing-company profile shown on the printable invoice
 * (`/invoices/[id]`). The backend has no "Company Settings" API domain (see
 * docs/HR_System_BE.postman_collection.json), so - like the wireframe's own
 * hardcoded-JSON prototype - this is a fixed, non-editable value rather than
 * fabricated data from a non-existent endpoint.
 */
export const INVOICING_COMPANY = {
  name: 'HR System Pte Ltd',
  addressLines: ['123 Business Park, #08-01', 'Singapore 123456'],
  email: 'billing@hrsystem.com',
  phone: '+65 6000 0000',
} as const;

/**
 * The wireframe's `/invoices/generate` form shows a disabled "Tax Rate (%)"
 * field, but `GenerateInvoice`'s real request body has no `TaxRate` field at
 * all (see docs/HR_System_BE.postman_collection.json) - `TaxAmount` is
 * computed and returned by the backend, not submitted by the client. This
 * form therefore shows the field as a read-only, informational note instead
 * of fabricating a parameter the API doesn't accept.
 */
export const INVOICE_TAX_RATE_NOTE =
  'Tax is calculated automatically by the backend and is not submitted from this form.';
