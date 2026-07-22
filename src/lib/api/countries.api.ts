import { axiosInstance } from '@/lib/api/axios';
import type { CountryListResponsePayload } from '@/types/api.types';
import type { Country } from '@/types/domain.types';

/**
 * Client-side Country reference-data module. `useCountries` calls this
 * instead of touching Axios directly; same-origin, against this app's own
 * `/api/countries` Route Handler.
 */
export async function getCountries(): Promise<Country[]> {
  const { data } = await axiosInstance.get<CountryListResponsePayload>('/countries');
  return data.countries;
}
