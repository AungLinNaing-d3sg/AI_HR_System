import { axiosInstance } from '@/lib/api/axios';
import type { ExchangeRateListResponsePayload, ExchangeRateMutationResponsePayload } from '@/types/api.types';
import type { ExchangeRate } from '@/types/domain.types';
import type { CreateExchangeRateFormValues, UpdateExchangeRateFormValues } from '@/lib/validators/exchangeRate.validators';

/**
 * Client-side Exchange Rate domain module. `useExchangeRates`/
 * `useCreateExchangeRate`/`useUpdateExchangeRate`/`useDeleteExchangeRate` call
 * these instead of touching Axios directly; every call here is same-origin,
 * against this app's own `/api/exchange-rates/*` Route Handlers.
 */

export interface ExchangeRateListParams {
  pageNo?: number;
  pageSize?: number;
  fromCurrencyId?: string;
}

export interface ExchangeRateListResult {
  exchangeRates: ExchangeRate[];
  totalCount: number;
}

/**
 * Lists exchange rates. `params` is omitted by `ExchangeRatesTable`'s summary
 * cards (which need every rate to compute the base currency's latest rate to
 * each other currency), while its own From/To/Rate table always passes
 * `pageNo`/`pageSize` (and `fromCurrencyId`, to only page through rates FROM
 * the base currency) to drive its pagination UI.
 */
export async function getExchangeRates(params: ExchangeRateListParams = {}): Promise<ExchangeRateListResult> {
  const { data } = await axiosInstance.get<ExchangeRateListResponsePayload>('/exchange-rates', { params });
  return { exchangeRates: data.exchangeRates, totalCount: data.totalCount };
}

/** Returns only `{ id, fromCurrencyId, toCurrencyId, rate, effectiveDate, isActive }` - see `ExchangeRateMutationResponsePayload`. */
export async function createExchangeRate(
  values: CreateExchangeRateFormValues
): Promise<ExchangeRateMutationResponsePayload['exchangeRate']> {
  const { data } = await axiosInstance.post<ExchangeRateMutationResponsePayload>('/exchange-rates', values);
  return data.exchangeRate;
}

export async function updateExchangeRate(
  id: string,
  values: UpdateExchangeRateFormValues
): Promise<ExchangeRateMutationResponsePayload['exchangeRate']> {
  const { data } = await axiosInstance.put<ExchangeRateMutationResponsePayload>(`/exchange-rates/${id}`, values);
  return data.exchangeRate;
}

export async function deleteExchangeRate(id: string): Promise<void> {
  await axiosInstance.delete(`/exchange-rates/${id}`);
}
