'use client';

import { useQuery } from '@tanstack/react-query';
import * as countriesApi from '@/lib/api/countries.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Fetches the list of countries for the optional Create User `CountryId`
 * dropdown, sourced from `GET /Country/GetAllCountries` (see
 * `app/api/countries/route.ts`). Query key: `['countries']`.
 */
export function useCountries() {
  const query = useQuery({
    queryKey: ['countries'],
    queryFn: () => countriesApi.getCountries(),
  });

  return {
    countries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load countries.') : null,
    refetch: query.refetch,
  };
}
