'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as currenciesApi from '@/lib/api/currencies.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateCurrencyFormValues } from '@/lib/validators/currency.validators';

/** Updates an existing currency and invalidates the `['currencies']` list so it refetches fresh data. */
export function useUpdateCurrency(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateCurrencyFormValues) => currenciesApi.updateCurrency(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
  });

  return {
    updateCurrency: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update the currency.') : null,
    reset: mutation.reset,
  };
}
