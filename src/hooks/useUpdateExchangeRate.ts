'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as exchangeRatesApi from '@/lib/api/exchangeRates.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateExchangeRateFormValues } from '@/lib/validators/exchangeRate.validators';

/** Updates an existing exchange rate and invalidates the `['exchangeRates']` list so it refetches fresh data. */
export function useUpdateExchangeRate(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateExchangeRateFormValues) => exchangeRatesApi.updateExchangeRate(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
    },
  });

  return {
    updateExchangeRate: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update the exchange rate.') : null,
    reset: mutation.reset,
  };
}
