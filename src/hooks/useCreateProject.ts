'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateProjectFormValues } from '@/lib/validators/project.validators';

/** Creates a new project and invalidates the `['projects']` list so it refetches with the new entry. */
export function useCreateProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateProjectFormValues) => projectsApi.createProject(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    createProject: mutation.mutateAsync,
    isCreating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not create the project.') : null,
    reset: mutation.reset,
  };
}
