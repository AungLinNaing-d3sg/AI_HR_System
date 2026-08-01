import { axiosInstance } from '@/lib/api/axios';
import type {
  ProjectAssignmentListResponsePayload,
  ProjectListResponsePayload,
  ProjectResponsePayload,
} from '@/types/api.types';
import type { ProjectAssignment, Project } from '@/types/domain.types';
import type {
  AssignResourceFormValues,
  CreateProjectFormValues,
  UpdateProjectFormValues,
} from '@/lib/validators/project.validators';

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

/**
 * Lists only the current `ProjectAdmin` caller's own assigned projects
 * (`GET /api/projects/mine` -> `Project/GetMyProjectList`). Used by
 * `useMyProjects` for the `/projects` management table (`useProjectList`,
 * `ProjectAdmin` branch) and the report/invoice Project filter/select
 * (`useProjectFilterOptions`) on `/reports/timesheet`, `/reports/cost-revenue`,
 * and `/invoices/generate`. A `SystemAdmin` (or any other role) keeps using
 * `getProjects` above for both.
 */
export async function getMyProjects(): Promise<Project[]> {
  const { data } = await axiosInstance.get<ProjectListResponsePayload>('/projects/mine');
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

export async function getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
  const { data } = await axiosInstance.get<ProjectAssignmentListResponsePayload>(
    `/projects/${projectId}/assignments`
  );
  return data.assignments;
}

export async function assignResource(
  projectId: string,
  values: AssignResourceFormValues
): Promise<ProjectAssignment[]> {
  const { data } = await axiosInstance.post<ProjectAssignmentListResponsePayload>(
    `/projects/${projectId}/assignments`,
    values
  );
  return data.assignments;
}

export async function removeResource(projectId: string, assignmentId: string): Promise<void> {
  await axiosInstance.delete(`/projects/${projectId}/assignments/${assignmentId}`);
}
