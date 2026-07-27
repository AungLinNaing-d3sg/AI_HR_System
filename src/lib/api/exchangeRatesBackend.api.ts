import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  CreateExchangeRateRequest,
  ExchangeRateListResponseDto,
  ExchangeRateMutationResponseDto,
  UpdateExchangeRateRequest,
} from '@/types/api.types';

/**
 * Server-only Exchange Rate domain module. Calls the real .NET
 * `/api/v1/ExchangeRate/*` endpoints (see
 * docs/HR_System_BE.postman_collection.json) through `backendClient`. Only
 * Route Handlers under `app/api/exchange-rates/**` may import this file - it
 * is never bundled for the browser.
 */

export interface ExchangeRateQuery {
  fromCurrencyId?: string;
  toCurrencyId?: string;
  isActive?: boolean;
  effectiveDate?: string;
  page?: number;
  pageSize?: number;
}

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * `[Auth]` - Mirrors `currenciesBackend.getAllCurrencies`'s defaults. Callers
 * that omit `page`/`pageSize` (e.g. the `/admin/exchange-rates` summary
 * cards' unpaginated fetch) get one large page up front rather than only the
 * backend's own default page of 20 (see
 * docs/HR_System_BE.postman_collection.json's `GetAllExchangeRates`
 * example); the table's own row list always passes explicit `page`/`pageSize`
 * to drive its real server-side pagination (see `app/api/exchange-rates/route.ts`).
 */
export async function getAllExchangeRates(
  accessToken: string,
  query: ExchangeRateQuery = {}
): Promise<ExchangeRateListResponseDto> {
  const response = await backendClient.get<ExchangeRateListResponseDto>('/ExchangeRate/GetAllExchangeRates', {
    headers: authHeader(accessToken),
    params: { page: 1, pageSize: 100, ...query },
  });
  return response.data;
}

/** `[Auth]` - Creates a new exchange rate between two currencies for a given effective date. */
export async function createExchangeRate(
  payload: CreateExchangeRateRequest,
  accessToken: string
): Promise<ExchangeRateMutationResponseDto> {
  const response = await backendClient.post<ExchangeRateMutationResponseDto>(
    '/ExchangeRate/CreateExchangeRate',
    payload,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

/** `[Auth]` - Updates the rate, effective date, and active status of an existing exchange rate. */
export async function updateExchangeRate(
  id: string,
  payload: UpdateExchangeRateRequest,
  accessToken: string
): Promise<ExchangeRateMutationResponseDto> {
  const response = await backendClient.put<ExchangeRateMutationResponseDto>(
    `/ExchangeRate/UpdateExchangeRate/${id}`,
    payload,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

/** `[Auth]` - Soft-deletes an exchange rate by its GUID. */
export async function deleteExchangeRate(id: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/ExchangeRate/DeleteExchangeRate/${id}`, { headers: authHeader(accessToken) });
}
