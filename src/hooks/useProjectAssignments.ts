'use client';

import { useQuery } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches a project's assigned resources. Query key: `['projects', projectId, 'assignments']`. */
export function useProjectAssignments(projectId: string) {
  const query = useQuery({
    queryKey: ['projects', projectId, 'assignments'],
    queryFn: () => projectsApi.getProjectAssignments(projectId),
    enabled: Boolean(projectId),
  });

  return {
    assignments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load this project’s assignments.') : null,
    refetch: query.refetch,
  };
}
