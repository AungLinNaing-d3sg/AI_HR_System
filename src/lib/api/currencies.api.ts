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

export interface CurrencyListParams {
  pageNo?: number;
  pageSize?: number;
}

export interface CurrencyListResult {
  currencies: Currency[];
  totalCount: number;
}

/**
 * Lists currencies. `params` is omitted by reference-data dropdown callers
 * (e.g. `GenerateInvoiceForm`/`ExchangeRateForm`/`RateCardForm`), which get
 * one large page back; the `/admin/currencies` management table always
 * passes `pageNo`/`pageSize` to drive its own pagination UI.
 */
export async function getCurrencies(params: CurrencyListParams = {}): Promise<CurrencyListResult> {
  const { data } = await axiosInstance.get<CurrencyListResponsePayload>('/currencies', { params });
  return { currencies: data.currencies, totalCount: data.totalCount };
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
