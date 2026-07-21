'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Transitions a Sent invoice to Paid, invalidating its list row and detail query so both refetch fresh state. */
export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => invoicesApi.markInvoicePaid(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id] });
    },
  });

  return {
    markInvoicePaid: mutation.mutateAsync,
    isMarkingPaid: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not mark the invoice as paid.') : null,
    reset: mutation.reset,
  };
}
