'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as exchangeRatesApi from '@/lib/api/exchangeRates.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateExchangeRateFormValues } from '@/lib/validators/exchangeRate.validators';

/** Creates a new exchange rate and invalidates the `['exchangeRates']` list so it refetches with the new entry. */
export function useCreateExchangeRate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateExchangeRateFormValues) => exchangeRatesApi.createExchangeRate(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
    },
  });

  return {
    createExchangeRate: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not create the exchange rate.') : null,
    reset: mutation.reset,
  };
}
