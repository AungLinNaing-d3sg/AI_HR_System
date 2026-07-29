'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as rateCardsApi from '@/lib/api/rateCards.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateRateCardFormValues } from '@/lib/validators/rateCard.validators';

/** Creates a new rate card and invalidates the `['rateCards']` list so it refetches with the new entry. */
export function useCreateRateCard() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateRateCardFormValues) => rateCardsApi.createRateCard(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rateCards'] });
    },
  });

  return {
    createRateCard: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not create the rate card.') : null,
    reset: mutation.reset,
  };
}
