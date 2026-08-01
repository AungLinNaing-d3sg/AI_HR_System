'use client';

import { useQuery } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/**
 * Lists all projects. Query key: `['projects']` (per the hierarchical tuple
 * convention).
 *
 * `enabled` (default `true`) lets a caller that only sometimes wants this
 * list - e.g. `useProjectFilterOptions`, which switches between this hook and
 * `useMyProjects` depending on the caller's role - opt out without firing an
 * unnecessary request.
 */
export function useProjects(enabled: boolean = true) {
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
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
