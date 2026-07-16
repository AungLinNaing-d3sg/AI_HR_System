'use client';

import { useQuery } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Fetches a single project by id. Query key: `['projects', id]` (per the hierarchical tuple convention). */
export function useProject(id: string) {
  const query = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.getProject(id),
    enabled: Boolean(id),
  });

  return {
    project: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load this project.') : null,
    refetch: query.refetch,
  };
}
