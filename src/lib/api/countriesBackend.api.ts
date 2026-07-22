import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type { CountryListResponseDto } from '@/types/api.types';

/**
 * Server-only Country reference-data module. Calls the real .NET
 * `/api/v1/Country/*` endpoints (see docs/HR_System_BE.postman_collection.json)
 * through `backendClient`. Only Route Handlers under `app/api/countries/**`
 * may import this file - it is never bundled for the browser.
 */

export interface CountryQuery {
  page?: number;
  pageSize?: number;
}

export async function getAllCountries(
  accessToken: string,
  query: CountryQuery = {}
): Promise<CountryListResponseDto> {
  const response = await backendClient.get<CountryListResponseDto>('/Country/GetAllCountries', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { page: 1, pageSize: 100, ...query },
  });
  return response.data;
}
