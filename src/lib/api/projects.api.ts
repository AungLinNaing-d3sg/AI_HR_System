import { axiosInstance } from '@/lib/api/axios';
import type { ProjectListResponsePayload, ProjectResponsePayload } from '@/types/api.types';
import type { Project } from '@/types/domain.types';
import type { CreateProjectFormValues, UpdateProjectFormValues } from '@/lib/validators/project.validators';

/**
 * Client-side Project domain module. Hooks (`useProjects`, `useProject`,
 * `useCreateProject`, `useUpdateProject`, `useDeleteProject`) call these
 * functions instead of touching Axios directly; every call here is
 * same-origin, against this app's own `/api/projects/*` Route Handlers,
 * which in turn call the real backend with the httpOnly-cookie-derived
 * access token.
 */

export async function getProjects(): Promise<Project[]> {
  const { data } = await axiosInstance.get<ProjectListResponsePayload>('/projects');
  return data.projects;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await axiosInstance.get<ProjectResponsePayload>(`/projects/${id}`);
  return data.project;
}

export async function createProject(values: CreateProjectFormValues): Promise<Project> {
  const { data } = await axiosInstance.post<ProjectResponsePayload>('/projects', values);
  return data.project;
}

export async function updateProject(id: string, values: UpdateProjectFormValues): Promise<Project> {
  const { data } = await axiosInstance.put<ProjectResponsePayload>(`/projects/${id}`, values);
  return data.project;
}

export async function deleteProject(id: string): Promise<void> {
  await axiosInstance.delete(`/projects/${id}`);
}
