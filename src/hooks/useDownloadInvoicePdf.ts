'use client';

import { useMutation } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Downloads an invoice's PDF (triggers a browser "Save As" via `invoicesApi.downloadInvoicePdf`). No cache to invalidate. */
export function useDownloadInvoicePdf() {
  const mutation = useMutation({
    mutationFn: ({ id, invoiceNumber }: { id: string; invoiceNumber: string }) =>
      invoicesApi.downloadInvoicePdf(id, invoiceNumber),
  });

  return {
    downloadInvoicePdf: mutation.mutateAsync,
    isDownloading: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not download the invoice PDF.') : null,
    reset: mutation.reset,
  };
}
