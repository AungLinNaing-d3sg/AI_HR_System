'use client';

import { useQuery } from '@tanstack/react-query';
import * as exchangeRatesApi from '@/lib/api/exchangeRates.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { ExchangeRateListParams } from '@/lib/api/exchangeRates.api';

/**
 * Fetches the list of exchange rates for the `/admin/exchange-rates` screen -
 * called with no arguments for the summary cards' full dataset, and with an
 * explicit `{ pageNo, pageSize, fromCurrencyId }` for the From/To/Rate
 * table's own server-side paginated data source. Query key:
 * `['exchangeRates', params]`.
 */
export function useExchangeRates(params: ExchangeRateListParams = {}) {
  const query = useQuery({
    queryKey: ['exchangeRates', params],
    queryFn: () => exchangeRatesApi.getExchangeRates(params),
  });

  return {
    exchangeRates: query.data?.exchangeRates ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load exchange rates.') : null,
    refetch: query.refetch,
  };
}
