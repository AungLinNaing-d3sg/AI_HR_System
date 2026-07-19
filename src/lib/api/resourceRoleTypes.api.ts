import { axiosInstance } from '@/lib/api/axios';
import type { ResourceRoleTypeListResponsePayload } from '@/types/api.types';
import type { ResourceRoleType } from '@/types/domain.types';

/**
 * Client-side Resource Role Type reference-data module. `useResourceRoleTypes`
 * calls this instead of touching Axios directly; same-origin, against this
 * app's own `/api/resource-role-types` Route Handler.
 */
export async function getResourceRoleTypes(): Promise<ResourceRoleType[]> {
  const { data } = await axiosInstance.get<ResourceRoleTypeListResponsePayload>('/resource-role-types');
  return data.roleTypes;
}
