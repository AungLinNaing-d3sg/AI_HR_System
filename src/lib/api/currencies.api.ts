import { axiosInstance } from '@/lib/api/axios';
import type { CurrencyListResponsePayload } from '@/types/api.types';
import type { Currency } from '@/types/domain.types';

/**
 * Client-side Currency reference-data module. `useCurrencies` calls this
 * instead of touching Axios directly; same-origin, against this app's own
 * `/api/currencies` Route Handler.
 */
export async function getCurrencies(): Promise<Currency[]> {
  const { data } = await axiosInstance.get<CurrencyListResponsePayload>('/currencies');
  return data.currencies;
}
