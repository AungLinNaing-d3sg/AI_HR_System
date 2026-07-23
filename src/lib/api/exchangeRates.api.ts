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
export async function getExchangeRates(): Promise<ExchangeRate[]> {
  const { data } = await axiosInstance.get<ExchangeRateListResponsePayload>('/exchange-rates');
  return data.exchangeRates;
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
