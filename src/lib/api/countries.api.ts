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
export async function getCountries(): Promise<Country[]> {
  const { data } = await axiosInstance.get<CountryListResponsePayload>('/countries');
  return data.countries;
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
