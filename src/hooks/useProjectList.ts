'use client';

import { useAuth } from '@/hooks/useAuth';
import { useMyProjects } from '@/hooks/useMyProjects';
import { useProjects } from '@/hooks/useProjects';

/**
 * Project list for the `/projects` management table (`ProjectsTable`).
 *
 * A `ProjectAdmin` only manages their own assigned projects, so this scopes
 * their list via `GET /Project/GetMyProjectList` (`useMyProjects`) instead of
 * the unscoped `GetProjectList` a `SystemAdmin` (or any other authenticated
 * role - e.g. plain `User`) still sees via `useProjects`. Mirrors the same
 * role split already used for the report/invoice Project filter/select (see
 * `useProjectFilterOptions`). Only one of the two underlying queries is
 * `enabled` at a time, so switching roles never fires both requests.
 */
export function useProjectList() {
  const { role } = useAuth();
  const isProjectAdmin = role === 'ProjectAdmin';

  const myProjects = useMyProjects(isProjectAdmin);
  const allProjects = useProjects(!isProjectAdmin);

  return isProjectAdmin ? myProjects : allProjects;
}
