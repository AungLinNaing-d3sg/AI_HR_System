'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as exchangeRatesApi from '@/lib/api/exchangeRates.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Deletes an exchange rate and invalidates the `['exchangeRates']` list so it refetches without the removed entry. */
export function useDeleteExchangeRate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => exchangeRatesApi.deleteExchangeRate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
    },
  });

  return {
    deleteExchangeRate: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not delete the exchange rate.') : null,
    reset: mutation.reset,
  };
}
