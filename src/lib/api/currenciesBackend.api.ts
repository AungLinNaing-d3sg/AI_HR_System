import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  CreateCurrencyRequest,
  CurrencyListResponseDto,
  CurrencyResponse,
  UpdateCurrencyRequest,
} from '@/types/api.types';

/**
 * Server-only Currency domain module. Calls the real .NET
 * `/api/v1/Currency/*` endpoints (see docs/HR_System_BE.postman_collection.json)
 * through `backendClient`. Only Route Handlers under `app/api/currencies/**`
 * may import this file - it is never bundled for the browser.
 */

export interface CurrencyQuery {
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function getAllCurrencies(
  accessToken: string,
  query: CurrencyQuery = {}
): Promise<CurrencyListResponseDto> {
  const response = await backendClient.get<CurrencyListResponseDto>('/Currency/GetAllCurrencies', {
    headers: authHeader(accessToken),
    params: { isActive: true, page: 1, pageSize: 100, ...query },
  });
  return response.data;
}

/** `[Auth]` - Code must be unique ISO 4217. Only one base currency is allowed at a time. */
export async function createCurrency(
  payload: CreateCurrencyRequest,
  accessToken: string
): Promise<CurrencyResponse> {
  const response = await backendClient.post<CurrencyResponse>('/Currency/CreateCurrency', payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

/** `[Auth]` - Updates the name, symbol, and active status of an existing currency. */
export async function updateCurrency(
  id: string,
  payload: UpdateCurrencyRequest,
  accessToken: string
): Promise<CurrencyResponse> {
  const response = await backendClient.put<CurrencyResponse>(`/Currency/UpdateCurrency/${id}`, payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

/** `[Auth]` - Soft-deletes a currency by its GUID. */
export async function deleteCurrency(id: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/Currency/DeleteCurrency/${id}`, { headers: authHeader(accessToken) });
}
