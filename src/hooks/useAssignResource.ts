'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '@/lib/api/projects.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { AssignResourceFormValues } from '@/lib/validators/project.validators';

/**
 * Assigns a user resource to a project and invalidates its cached
 * assignments. The searchable "Add User" combobox's own results
 * (`['auth', 'search-users', ...]`, see `useUserSearch`) don't need
 * invalidating here: unlike the removed `GetUnassignedUsers`/`useUserList`
 * dropdown this replaces, `GET /Auth/SearchUsers` isn't scoped to a
 * project's current assignments, so a newly-assigned user still matches a
 * future search.
 */
export function useAssignResource(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: AssignResourceFormValues) => projectsApi.assignResource(projectId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'assignments'] });
    },
  });

  return {
    assignResource: mutation.mutateAsync,
    isAssigning: mutation.isPending,
    error: mutation.error ? getApiErrorMessage(mutation.error, 'Could not assign this user to the project.') : null,
    reset: mutation.reset,
  };
}
