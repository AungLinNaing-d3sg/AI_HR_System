'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Deletes a project and invalidates the `['projects']` list so it refetches without the removed entry. */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    deleteProject: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not delete the project.') : null,
    reset: mutation.reset,
  };
}
