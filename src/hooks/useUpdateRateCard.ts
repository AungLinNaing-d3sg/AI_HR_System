'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as rateCardsApi from '@/lib/api/rateCards.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateRateCardFormValues } from '@/lib/validators/rateCard.validators';

/** Updates an existing rate card and invalidates the `['rateCards']` list so it refetches fresh data. */
export function useUpdateRateCard(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateRateCardFormValues) => rateCardsApi.updateRateCard(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rateCards'] });
    },
  });

  return {
    updateRateCard: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update the rate card.') : null,
    reset: mutation.reset,
  };
}
