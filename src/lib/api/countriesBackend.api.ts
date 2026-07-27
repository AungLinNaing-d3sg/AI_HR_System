import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  CountryListResponseDto,
  CountryResponse,
  CreateCountryRequest,
  UpdateCountryRequest,
} from '@/types/api.types';

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

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function getAllCountries(
  accessToken: string,
  query: CountryQuery = {}
): Promise<CountryListResponseDto> {
  const response = await backendClient.get<CountryListResponseDto>('/Country/GetAllCountries', {
    headers: authHeader(accessToken),
    params: { page: 1, pageSize: 100, ...query },
  });
  return response.data;
}

/** `[Auth]` - Code must be a unique ISO 3166-1 alpha-2 code. */
export async function createCountry(
  payload: CreateCountryRequest,
  accessToken: string
): Promise<CountryResponse> {
  const response = await backendClient.post<CountryResponse>('/Country/CreateCountry', payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

/** `[Auth]` - Updates the name of an existing country. `Code` is fixed at creation time. */
export async function updateCountry(
  id: string,
  payload: UpdateCountryRequest,
  accessToken: string
): Promise<CountryResponse> {
  const response = await backendClient.put<CountryResponse>(`/Country/UpdateCountry/${id}`, payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

/** `[Auth]` - Soft-deletes a country by its GUID. */
export async function deleteCountry(id: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/Country/DeleteCountry/${id}`, { headers: authHeader(accessToken) });
}
