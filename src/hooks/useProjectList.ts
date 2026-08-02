'use client';

import { useAuth } from '@/hooks/useAuth';
import { useMyProjects } from '@/hooks/useMyProjects';
import { useProjects } from '@/hooks/useProjects';
import { MY_PROJECT_LIST_ROLES } from '@/lib/constants/project.constants';

/**
 * Project list for the `/projects` management table (`ProjectsTable`).
 *
 * A `ProjectAdmin` only manages, and a plain `User` (the backend's "Employee"
 * role) only works, their own assigned projects - so both scope their list
 * via `GET /Project/GetMyProjectList` (`useMyProjects`, see
 * `MY_PROJECT_LIST_ROLES`) instead of the unscoped `GetProjectList` a
 * `SystemAdmin` (or `Guest`) still sees via `useProjects`. Mirrors the same
 * `ProjectAdmin` split already used for the report/invoice Project
 * filter/select (see `useProjectFilterOptions`). Only one of the two
 * underlying queries is `enabled` at a time, so switching roles never fires
 * both requests.
 */
export function useProjectList() {
  const { role } = useAuth();
  const isMyProjectsRole = Boolean(role && MY_PROJECT_LIST_ROLES.includes(role));

  const myProjects = useMyProjects(isMyProjectsRole);
  const allProjects = useProjects(!isMyProjectsRole);

  return isMyProjectsRole ? myProjects : allProjects;
}
