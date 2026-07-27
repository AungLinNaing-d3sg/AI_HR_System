'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Voids an invoice (any status), invalidating its list row and detail query so both refetch fresh state. */
export function useVoidInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => invoicesApi.voidInvoice(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id] });
    },
  });

  return {
    voidInvoice: mutation.mutateAsync,
    isVoiding: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not void the invoice.') : null,
    reset: mutation.reset,
  };
}
