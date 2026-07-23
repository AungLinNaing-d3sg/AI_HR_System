import { axiosInstance } from '@/lib/api/axios';
import type { CurrencyListResponsePayload, CurrencyResponsePayload } from '@/types/api.types';
import type { Currency } from '@/types/domain.types';
import type { CreateCurrencyFormValues, UpdateCurrencyFormValues } from '@/lib/validators/currency.validators';

/**
 * Client-side Currency domain module. `useCurrencies`/`useCreateCurrency`/
 * `useUpdateCurrency`/`useDeleteCurrency` call these instead of touching
 * Axios directly; every call here is same-origin, against this app's own
 * `/api/currencies/*` Route Handlers.
 */
export async function getCurrencies(): Promise<Currency[]> {
  const { data } = await axiosInstance.get<CurrencyListResponsePayload>('/currencies');
  return data.currencies;
}

export async function createCurrency(values: CreateCurrencyFormValues): Promise<Currency> {
  const { data } = await axiosInstance.post<CurrencyResponsePayload>('/currencies', values);
  return data.currency;
}

export async function updateCurrency(id: string, values: UpdateCurrencyFormValues): Promise<Currency> {
  const { data } = await axiosInstance.put<CurrencyResponsePayload>(`/currencies/${id}`, values);
  return data.currency;
}

export async function deleteCurrency(id: string): Promise<void> {
  await axiosInstance.delete(`/currencies/${id}`);
}
