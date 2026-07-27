'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as rateCardsApi from '@/lib/api/rateCards.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Deletes a rate card and invalidates the `['rateCards']` list so it refetches without the removed entry. */
export function useDeleteRateCard() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => rateCardsApi.deleteRateCard(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rateCards'] });
    },
  });

  return {
    deleteRateCard: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not delete the rate card.') : null,
    reset: mutation.reset,
  };
}
