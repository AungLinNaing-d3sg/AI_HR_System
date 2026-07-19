'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Removes a resource assignment and invalidates its project's cached assignments/unassigned-users lists. */
export function useRemoveResource(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (assignmentId: string) => projectsApi.removeResource(projectId, assignmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'unassigned-users'] });
    },
  });

  return {
    removeResource: mutation.mutateAsync,
    isRemoving: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not remove this assignment.') : null,
    reset: mutation.reset,
  };
}
