import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type { CurrencyListResponseDto } from '@/types/api.types';

/**
 * Server-only Currency reference-data module. Calls the real .NET
 * `/api/v1/Currency/*` endpoints (see docs/HR_System_BE.postman_collection.json)
 * through `backendClient`. Only Route Handlers under `app/api/currencies/**`
 * may import this file - it is never bundled for the browser.
 */

export interface CurrencyQuery {
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getAllCurrencies(
  accessToken: string,
  query: CurrencyQuery = {}
): Promise<CurrencyListResponseDto> {
  const response = await backendClient.get<CurrencyListResponseDto>('/Currency/GetAllCurrencies', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { isActive: true, page: 1, pageSize: 100, ...query },
  });
  return response.data;
}
