'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateInvoiceFormValues } from '@/lib/validators/invoice.validators';

/**
 * Updates a Draft invoice's editable fields and invalidates both the
 * `['invoices', 'list']` list and the `['invoices', 'detail', id]` query so
 * both refetch fresh data (`UpdateInvoice`'s own response is a partial
 * confirmation - see `InvoiceUpdateResponsePayload` - so the full, current
 * invoice is only available again after that refetch).
 */
export function useUpdateInvoice(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateInvoiceFormValues) => invoicesApi.updateInvoice(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id] });
    },
  });

  return {
    updateInvoice: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update the invoice.') : null,
    reset: mutation.reset,
  };
}
