'use client';

import { useQuery } from '@tanstack/react-query';
import * as rateCardsApi from '@/lib/api/rateCards.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches the list of rate cards for the `/admin/rate-cards` table. Query key: `['rateCards']`. */
export function useRateCards() {
  const query = useQuery({
    queryKey: ['rateCards'],
    queryFn: () => rateCardsApi.getRateCards(),
  });

  return {
    rateCards: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load rate cards.') : null,
    refetch: query.refetch,
  };
}
