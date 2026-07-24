import { axiosInstance } from '@/lib/api/axios';
import type { ResourceRoleTypeListResponsePayload, ResourceRoleTypeResponsePayload } from '@/types/api.types';
import type { ResourceRoleType } from '@/types/domain.types';
import type {
  CreateResourceRoleTypeFormValues,
  UpdateResourceRoleTypeFormValues,
} from '@/lib/validators/resourceRoleType.validators';

/**
 * Client-side Resource Role Type domain module. `useResourceRoleTypes`/
 * `useCreateResourceRoleType`/`useUpdateResourceRoleType`/
 * `useDeleteResourceRoleType` call these instead of touching Axios directly;
 * every call here is same-origin, against this app's own
 * `/api/resource-role-types/*` Route Handlers.
 */
export async function getResourceRoleTypes(): Promise<ResourceRoleType[]> {
  const { data } = await axiosInstance.get<ResourceRoleTypeListResponsePayload>('/resource-role-types');
  return data.roleTypes;
}

export async function createResourceRoleType(
  values: CreateResourceRoleTypeFormValues
): Promise<ResourceRoleType> {
  const { data } = await axiosInstance.post<ResourceRoleTypeResponsePayload>('/resource-role-types', values);
  return data.roleType;
}

export async function updateResourceRoleType(
  id: string,
  values: UpdateResourceRoleTypeFormValues
): Promise<ResourceRoleType> {
  const { data } = await axiosInstance.put<ResourceRoleTypeResponsePayload>(
    `/resource-role-types/${id}`,
    values
  );
  return data.roleType;
}

export async function deleteResourceRoleType(id: string): Promise<void> {
  await axiosInstance.delete(`/resource-role-types/${id}`);
}
