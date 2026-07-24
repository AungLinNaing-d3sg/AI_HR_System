'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as resourceRoleTypesApi from '@/lib/api/resourceRoleTypes.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';

/** Deletes a resource role type and invalidates the `['resource-role-types']` list so it refetches without the removed entry. */
export function useDeleteResourceRoleType() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => resourceRoleTypesApi.deleteResourceRoleType(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resource-role-types'] });
    },
  });

  return {
    deleteResourceRoleType: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error
      ? getApiErrorMessage(mutation.error, 'Could not delete the resource role type.')
      : null,
    reset: mutation.reset,
  };
}
