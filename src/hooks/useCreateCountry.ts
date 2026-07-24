'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as countriesApi from '@/lib/api/countries.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateCountryFormValues } from '@/lib/validators/country.validators';

/** Creates a new country and invalidates the `['countries']` list so it refetches with the new entry. */
export function useCreateCountry() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateCountryFormValues) => countriesApi.createCountry(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });

  return {
    createCountry: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not create the country.') : null,
    reset: mutation.reset,
  };
}
