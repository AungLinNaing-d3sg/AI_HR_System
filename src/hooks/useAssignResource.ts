'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { AssignResourceFormValues } from '@/lib/validators/project.validators';

/** Assigns a user resource to a project and invalidates its cached assignments/unassigned-users lists. */
export function useAssignResource(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: AssignResourceFormValues) => projectsApi.assignResource(projectId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'unassigned-users'] });
    },
  });

  return {
    assignResource: mutation.mutateAsync,
    isAssigning: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not assign this user to the project.') : null,
    reset: mutation.reset,
  };
}
