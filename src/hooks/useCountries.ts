'use client';

import { useQuery } from '@tanstack/react-query';
import * as countriesApi from '@/lib/api/countries.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CountryListParams } from '@/lib/api/countries.api';

/**
 * Fetches the list of countries - used both as the optional Create User
 * `CountryId` dropdown's reference data (called with no arguments, sourced
 * from `GET /Country/GetAllCountries` - see `app/api/countries/route.ts`)
 * and, with an explicit `{ pageNo, pageSize }`, as the `/admin/countries`
 * management table's own server-side paginated data source. Query key:
 * `['countries', params]`.
 */
export function useCountries(params: CountryListParams = {}) {
  const query = useQuery({
    queryKey: ['countries', params],
    queryFn: () => countriesApi.getCountries(params),
  });

  return {
    countries: query.data?.countries ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load countries.') : null,
    refetch: query.refetch,
  };
}
