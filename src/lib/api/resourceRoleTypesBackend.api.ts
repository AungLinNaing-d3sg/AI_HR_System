import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type { ResourceRoleTypeListResponse } from '@/types/api.types';

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
