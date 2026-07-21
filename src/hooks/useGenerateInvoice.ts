'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as invoicesApi from '@/lib/api/invoices.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { GenerateInvoiceFormValues } from '@/lib/validators/invoice.validators';

/** Generates a new Draft invoice and invalidates the `['invoices', 'list']` query so it refetches with the new entry. */
export function useGenerateInvoice() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: GenerateInvoiceFormValues) => invoicesApi.generateInvoice(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoices', 'list'] });
    },
  });

  return {
    generateInvoice: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not generate the invoice.') : null,
    reset: mutation.reset,
  };
}
