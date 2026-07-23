import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  CreateRateCardRequest,
  RateCardListResponseDto,
  RateCardMutationResponseDto,
  UpdateRateCardRequest,
} from '@/types/api.types';

/**
 * Server-only Rate Card domain module. Calls the real .NET
 * `/api/v1/RateCard/*` endpoints (see docs/HR_System_BE.postman_collection.json)
 * through `backendClient`. Only Route Handlers under `app/api/rate-cards/**`
 * may import this file - it is never bundled for the browser.
 */

export interface RateCardQuery {
  countryId?: string;
  resourceRoleTypeId?: string;
  currencyId?: string;
  isActive?: boolean;
  effectiveDate?: string;
  page?: number;
  pageSize?: number;
}

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * `[Auth]` - Mirrors `exchangeRatesBackend.getAllExchangeRates`'s defaults:
 * the `/admin/rate-cards` table has no pagination UI, so a large `pageSize`
 * is requested up front rather than only the backend's own default page of
 * 20 (see docs/HR_System_BE.postman_collection.json's `GetAllRateCards`
 * example).
 */
export async function getAllRateCards(
  accessToken: string,
  query: RateCardQuery = {}
): Promise<RateCardListResponseDto> {
  const response = await backendClient.get<RateCardListResponseDto>('/RateCard/GetAllRateCards', {
    headers: authHeader(accessToken),
    params: { page: 1, pageSize: 100, ...query },
  });
  return response.data;
}

/** `[Auth]` - Creates a new rate card for a given country, resource role type, and currency. */
export async function createRateCard(
  payload: CreateRateCardRequest,
  accessToken: string
): Promise<RateCardMutationResponseDto> {
  const response = await backendClient.post<RateCardMutationResponseDto>('/RateCard/CreateRateCard', payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

/** `[Auth]` - Updates the hourly rate, billing rate, effective date, and active status of an existing rate card. */
export async function updateRateCard(
  id: string,
  payload: UpdateRateCardRequest,
  accessToken: string
): Promise<RateCardMutationResponseDto> {
  const response = await backendClient.put<RateCardMutationResponseDto>(`/RateCard/UpdateRateCard/${id}`, payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

/** `[Auth]` - Soft-deletes a rate card by its GUID. */
export async function deleteRateCard(id: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/RateCard/DeleteRateCard/${id}`, { headers: authHeader(accessToken) });
}
