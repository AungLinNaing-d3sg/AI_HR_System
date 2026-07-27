'use client';

import { useQuery } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Lists all projects. Query key: `['projects']` (per the hierarchical tuple convention). */
export function useProjects() {
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? getApiErrorMessage(query.error, 'Could not load projects.') : null,
    refetch: query.refetch,
  };
}
