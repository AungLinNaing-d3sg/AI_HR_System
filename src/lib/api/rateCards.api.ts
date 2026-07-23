import { axiosInstance } from '@/lib/api/axios';
import type { RateCardListResponsePayload, RateCardMutationResponsePayload } from '@/types/api.types';
import type { RateCard } from '@/types/domain.types';
import type { CreateRateCardFormValues, UpdateRateCardFormValues } from '@/lib/validators/rateCard.validators';

/**
 * Client-side Rate Card domain module. `useRateCards`/`useCreateRateCard`/
 * `useUpdateRateCard`/`useDeleteRateCard` call these instead of touching
 * Axios directly; every call here is same-origin, against this app's own
 * `/api/rate-cards/*` Route Handlers.
 */
export async function getRateCards(): Promise<RateCard[]> {
  const { data } = await axiosInstance.get<RateCardListResponsePayload>('/rate-cards');
  return data.rateCards;
}

/** Returns only `{ id, countryId, resourceRoleTypeId, currencyId, hourlyRate, billingRate, effectiveDate, isActive }` - see `RateCardMutationResponsePayload`. */
export async function createRateCard(
  values: CreateRateCardFormValues
): Promise<RateCardMutationResponsePayload['rateCard']> {
  const { data } = await axiosInstance.post<RateCardMutationResponsePayload>('/rate-cards', values);
  return data.rateCard;
}

export async function updateRateCard(
  id: string,
  values: UpdateRateCardFormValues
): Promise<RateCardMutationResponsePayload['rateCard']> {
  const { data } = await axiosInstance.put<RateCardMutationResponsePayload>(`/rate-cards/${id}`, values);
  return data.rateCard;
}

export async function deleteRateCard(id: string): Promise<void> {
  await axiosInstance.delete(`/rate-cards/${id}`);
}
