'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateProjectFormValues } from '@/lib/validators/project.validators';

/**
 * Updates an existing project and invalidates both the `['projects']` list
 * and the `['projects', id]` detail query so both refetch fresh data.
 */
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateProjectFormValues) => projectsApi.updateProject(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });

  return {
    updateProject: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not update the project.') : null,
    reset: mutation.reset,
  };
}
