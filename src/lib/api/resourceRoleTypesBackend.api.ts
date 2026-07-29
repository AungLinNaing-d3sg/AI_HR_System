import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  CreateResourceRoleTypeRequest,
  ResourceRoleTypeListResponse,
  ResourceRoleTypeResponse,
  UpdateResourceRoleTypeRequest,
} from '@/types/api.types';

/**
 * Server-only Resource Role Type reference-data module. Calls the real
 * .NET `/api/v1/ResourceRoleType/*` endpoints (see
 * docs/HR_System_BE.postman_collection.json) through `backendClient`. Only
 * Route Handlers under `app/api/resource-role-types/**` may import this
 * file - it is never bundled for the browser.
 */

export interface ResourceRoleTypeQuery {
  page?: number;
  pageSize?: number;
}

export async function getAllResourceRoleTypes(
  accessToken: string,
  query: ResourceRoleTypeQuery = {}
): Promise<ResourceRoleTypeListResponse> {
  const response = await backendClient.get<ResourceRoleTypeListResponse>(
    '/ResourceRoleType/GetAllResourceRoleTypes',
    { headers: { Authorization: `Bearer ${accessToken}` }, params: { page: 1, pageSize: 100, ...query } }
  );
  return response.data;
}

/** `[Auth]` - `Name` must be unique across resource role types; `Description` is optional. */
export async function createResourceRoleType(
  payload: CreateResourceRoleTypeRequest,
  accessToken: string
): Promise<ResourceRoleTypeResponse> {
  const response = await backendClient.post<ResourceRoleTypeResponse>(
    '/ResourceRoleType/CreateResourceRoleType',
    payload,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

/** `[Auth]` - Updates the name and description of an existing resource role type. */
export async function updateResourceRoleType(
  id: string,
  payload: UpdateResourceRoleTypeRequest,
  accessToken: string
): Promise<ResourceRoleTypeResponse> {
  const response = await backendClient.put<ResourceRoleTypeResponse>(
    `/ResourceRoleType/UpdateResourceRoleType/${id}`,
    payload,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

/** `[Auth]` - Soft-deletes a resource role type by its GUID. */
export async function deleteResourceRoleType(id: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/ResourceRoleType/DeleteResourceRoleType/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
