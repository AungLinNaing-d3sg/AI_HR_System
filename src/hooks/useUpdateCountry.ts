'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as countriesApi from '@/lib/api/countries.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateCountryFormValues } from '@/lib/validators/country.validators';

/** Updates an existing country and invalidates the `['countries']` list so it refetches fresh data. */
export function useUpdateCountry(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateCountryFormValues) => countriesApi.updateCountry(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });

  return {
    updateCountry: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update the country.') : null,
    reset: mutation.reset,
  };
}
