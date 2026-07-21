'use client';

import { useQuery } from '@tanstack/react-query';
import * as currenciesApi from '@/lib/api/currencies.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches the list of currencies for the invoice currency dropdown. Query key: `['currencies']`. */
export function useCurrencies() {
  const query = useQuery({
    queryKey: ['currencies'],
    queryFn: () => currenciesApi.getCurrencies(),
  });

  return {
    currencies: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load currencies.') : null,
    refetch: query.refetch,
  };
}
