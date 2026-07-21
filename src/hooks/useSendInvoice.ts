'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Transitions a Draft invoice to Sent, invalidating its list row and detail query so both refetch fresh state. */
export function useSendInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => invoicesApi.sendInvoice(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id] });
    },
  });

  return {
    sendInvoice: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not send the invoice.') : null,
    reset: mutation.reset,
  };
}
