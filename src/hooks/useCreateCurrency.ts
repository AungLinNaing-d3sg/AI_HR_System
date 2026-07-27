'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as currenciesApi from '@/lib/api/currencies.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateCurrencyFormValues } from '@/lib/validators/currency.validators';

/** Creates a new currency and invalidates the `['currencies']` list so it refetches with the new entry. */
export function useCreateCurrency() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateCurrencyFormValues) => currenciesApi.createCurrency(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
  });

  return {
    createCurrency: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not create the currency.') : null,
    reset: mutation.reset,
  };
}
