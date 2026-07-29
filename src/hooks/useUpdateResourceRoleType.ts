'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as resourceRoleTypesApi from '@/lib/api/resourceRoleTypes.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { UpdateResourceRoleTypeFormValues } from '@/lib/validators/resourceRoleType.validators';

/** Updates an existing resource role type and invalidates the `['resource-role-types']` list so it refetches fresh data. */
export function useUpdateResourceRoleType(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: UpdateResourceRoleTypeFormValues) =>
      resourceRoleTypesApi.updateResourceRoleType(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resource-role-types'] });
    },
  });

  return {
    updateResourceRoleType: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error
      ? getApiErrorMessage(mutation.error, 'Could not update the resource role type.')
      : null,
    reset: mutation.reset,
  };
}
