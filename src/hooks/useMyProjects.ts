'use client';

import { useQuery } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Lists only the current `ProjectAdmin` caller's own assigned projects
 * (`GET /api/projects/mine` -> `Project/GetMyProjectList`). Backs the
 * `ProjectAdmin` branch of `useProjectFilterOptions` (the Project
 * filter/select on `/reports/timesheet`, `/reports/cost-revenue`, and
 * `/invoices/generate`) and of `useProjectList` (the `/projects` management
 * table, `ProjectsTable`) for a `ProjectAdmin` caller. Query key:
 * `['projects', 'mine']`.
 *
 * `enabled` (default `true`) lets `useProjectFilterOptions` skip this query
 * entirely for a non-`ProjectAdmin` caller, so switching roles never fires
 * both this hook's request and `useProjects`' at once.
 */
export function useMyProjects(enabled: boolean = true) {
  const query = useQuery({
    queryKey: ['projects', 'mine'],
    queryFn: projectsApi.getMyProjects,
    enabled,
  });

  return {
    projects: query.data ?? [],
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    error: enabled && query.error ? getApiErrorMessage(query.error, 'Could not load projects.') : null,
    refetch: query.refetch,
  };
}
