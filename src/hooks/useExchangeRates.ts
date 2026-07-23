'use client';

import { useQuery } from '@tanstack/react-query';
import * as exchangeRatesApi from '@/lib/api/exchangeRates.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches the list of exchange rates for the `/admin/exchange-rates` table. Query key: `['exchangeRates']`. */
export function useExchangeRates() {
  const query = useQuery({
    queryKey: ['exchangeRates'],
    queryFn: () => exchangeRatesApi.getExchangeRates(),
  });

  return {
    exchangeRates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load exchange rates.') : null,
    refetch: query.refetch,
  };
}
