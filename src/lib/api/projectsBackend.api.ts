import 'server-only';

import { backendClient } from '@/lib/api/backendClient';
import type {
  AssignResourceRequest,
  AssignResourceResponseDto,
  CreateProjectRequest,
  ProjectAssignmentListResponse,
  ProjectListResponse,
  ProjectResponse,
  UpdateProjectRequest,
} from '@/types/api.types';

/**
 * Server-only Project domain module. Every function here calls the real
 * .NET `/api/v1/Project/*` endpoints (see
 * docs/HR_System_BE.postman_collection.json) through `backendClient`. Only
 * Route Handlers under `app/api/projects/**` may import this file - it is
 * never bundled for the browser.
 */

function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function getProjectList(accessToken: string): Promise<ProjectListResponse> {
  const response = await backendClient.get<ProjectListResponse>('/Project/GetProjectList', {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export async function getProject(id: string, accessToken: string): Promise<ProjectResponse> {
  const response = await backendClient.get<ProjectResponse>(`/Project/GetProject/${id}`, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export async function createProject(
  payload: CreateProjectRequest,
  accessToken: string
): Promise<ProjectResponse> {
  const response = await backendClient.post<ProjectResponse>('/Project/CreateProject', payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export async function updateProject(
  id: string,
  payload: UpdateProjectRequest,
  accessToken: string
): Promise<ProjectResponse> {
  const response = await backendClient.put<ProjectResponse>(`/Project/UpdateProject/${id}`, payload, {
    headers: authHeader(accessToken),
  });
  return response.data;
}

export async function deleteProject(id: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/Project/DeleteProject/${id}`, { headers: authHeader(accessToken) });
}

export async function getProjectAssignments(
  projectId: string,
  accessToken: string
): Promise<ProjectAssignmentListResponse> {
  const response = await backendClient.get<ProjectAssignmentListResponse>(
    `/Project/GetProjectAssignments/${projectId}`,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

export async function assignResource(
  projectId: string,
  payload: AssignResourceRequest,
  accessToken: string
): Promise<AssignResourceResponseDto> {
  const response = await backendClient.post<AssignResourceResponseDto>(
    `/Project/AssignResource/${projectId}`,
    payload,
    { headers: authHeader(accessToken) }
  );
  return response.data;
}

/** `RemoveResource` returns `Data: null` on success - see `RemoveResourceResponse` in api.types.ts. */
export async function removeResource(projectId: string, assignmentId: string, accessToken: string): Promise<void> {
  await backendClient.delete(`/Project/RemoveResource/${projectId}/${assignmentId}`, {
    headers: authHeader(accessToken),
  });
}
