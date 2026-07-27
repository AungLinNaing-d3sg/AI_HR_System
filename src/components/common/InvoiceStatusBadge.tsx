import { INVOICE_STATUS_BADGE_CLASSNAMES, INVOICE_STATUS_LABELS } from '@/lib/constants/invoice.constants';
import { cn } from '@/lib/utils/cn';
import type { InvoiceStatus } from '@/types/domain.types';

/** Small colored status pill shared by `InvoicesTable` and `InvoiceDetailPanel`, matching the wireframe's invoice status badges. */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        INVOICE_STATUS_BADGE_CLASSNAMES[status]
      )}
    >
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
