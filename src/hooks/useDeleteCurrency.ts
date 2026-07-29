'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as currenciesApi from '@/lib/api/currencies.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Deletes a currency and invalidates the `['currencies']` list so it refetches without the removed entry. */
export function useDeleteCurrency() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => currenciesApi.deleteCurrency(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
  });

  return {
    deleteCurrency: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not delete the currency.') : null,
    reset: mutation.reset,
  };
}
