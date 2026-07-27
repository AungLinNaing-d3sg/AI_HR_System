'use client';

import { useQuery } from '@tanstack/react-query';
import * as rateCardsApi from '@/lib/api/rateCards.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { RateCardListParams } from '@/lib/api/rateCards.api';

/**
 * Fetches the list of rate cards - called with no arguments for
 * `CountriesTable`'s per-country rate-card counts and `RateCardsTable`'s own
 * country summary cards (both need every rate card), and with an explicit
 * `{ pageNo, pageSize, countryId }` for `RateCardsTable`'s Country/Role/Daily
 * Rate table's own server-side paginated data source. Query key:
 * `['rateCards', params]`.
 */
export function useRateCards(params: RateCardListParams = {}) {
  const query = useQuery({
    queryKey: ['rateCards', params],
    queryFn: () => rateCardsApi.getRateCards(params),
  });

  return {
    rateCards: query.data?.rateCards ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load rate cards.') : null,
    refetch: query.refetch,
  };
}
