import { axiosInstance } from '@/lib/api/axios';
import type { CountryListResponsePayload, CountryResponsePayload } from '@/types/api.types';
import type { Country } from '@/types/domain.types';
import type { CreateCountryFormValues, UpdateCountryFormValues } from '@/lib/validators/country.validators';

/**
 * Client-side Country domain module. `useCountries`/`useCreateCountry`/
 * `useUpdateCountry`/`useDeleteCountry` call these instead of touching Axios
 * directly; every call here is same-origin, against this app's own
 * `/api/countries/*` Route Handlers.
 */

export interface CountryListParams {
  pageNo?: number;
  pageSize?: number;
}

export interface CountryListResult {
  countries: Country[];
  totalCount: number;
}

/**
 * Lists countries. `params` is omitted by reference-data dropdown callers
 * (e.g. `CreateUserForm`/`RateCardForm`), which get one large page back; the
 * `/admin/countries` management table always passes `pageNo`/`pageSize` to
 * drive its own pagination UI.
 */
export async function getCountries(params: CountryListParams = {}): Promise<CountryListResult> {
  const { data } = await axiosInstance.get<CountryListResponsePayload>('/countries', { params });
  return { countries: data.countries, totalCount: data.totalCount };
}

export async function createCountry(values: CreateCountryFormValues): Promise<Country> {
  const { data } = await axiosInstance.post<CountryResponsePayload>('/countries', values);
  return data.country;
}

export async function updateCountry(id: string, values: UpdateCountryFormValues): Promise<Country> {
  const { data } = await axiosInstance.put<CountryResponsePayload>(`/countries/${id}`, values);
  return data.country;
}

export async function deleteCountry(id: string): Promise<void> {
  await axiosInstance.delete(`/countries/${id}`);
}
