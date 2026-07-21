'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Deletes a Draft invoice and invalidates the `['invoices', 'list']` query so it refetches without the removed entry. */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => invoicesApi.deleteInvoice(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
    },
  });

  return {
    deleteInvoice: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not delete the invoice.') : null,
    reset: mutation.reset,
  };
}
