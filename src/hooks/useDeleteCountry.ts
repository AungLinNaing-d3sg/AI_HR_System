'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as countriesApi from '@/lib/api/countries.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Deletes a country and invalidates the `['countries']` list so it refetches without the removed entry. */
export function useDeleteCountry() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => countriesApi.deleteCountry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['countries'] });
    },
  });

  return {
    deleteCountry: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not delete the country.') : null,
    reset: mutation.reset,
  };
}
