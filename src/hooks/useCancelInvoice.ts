'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Cancels an invoice (any status), invalidating its list row and detail query so both refetch fresh state. */
export function useCancelInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => invoicesApi.cancelInvoice(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id] });
    },
  });

  return {
    cancelInvoice: mutation.mutateAsync,
    isCancelling: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not cancel the invoice.') : null,
    reset: mutation.reset,
  };
}
