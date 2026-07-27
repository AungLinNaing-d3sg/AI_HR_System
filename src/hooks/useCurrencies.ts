'use client';

import { useQuery } from '@tanstack/react-query';
import * as currenciesApi from '@/lib/api/currencies.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CurrencyListParams } from '@/lib/api/currencies.api';

/**
 * Fetches the list of currencies - used both as the invoice currency
 * dropdown's reference data (called with no arguments) and, with an explicit
 * `{ pageNo, pageSize }`, as the `/admin/currencies` management table's own
 * server-side paginated data source. Query key: `['currencies', params]`.
 */
export function useCurrencies(params: CurrencyListParams = {}) {
  const query = useQuery({
    queryKey: ['currencies', params],
    queryFn: () => currenciesApi.getCurrencies(params),
  });

  return {
    currencies: query.data?.currencies ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load currencies.') : null,
    refetch: query.refetch,
  };
}
