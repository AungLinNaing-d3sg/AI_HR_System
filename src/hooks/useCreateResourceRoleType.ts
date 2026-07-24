'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as resourceRoleTypesApi from '@/lib/api/resourceRoleTypes.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import type { CreateResourceRoleTypeFormValues } from '@/lib/validators/resourceRoleType.validators';

/** Creates a new resource role type and invalidates the `['resource-role-types']` list so it refetches with the new entry. */
export function useCreateResourceRoleType() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateResourceRoleTypeFormValues) =>
      resourceRoleTypesApi.createResourceRoleType(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resource-role-types'] });
    },
  });

  return {
    createResourceRoleType: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error
      ? getApiErrorMessage(mutation.error, 'Could not create the resource role type.')
      : null,
    reset: mutation.reset,
  };
}
