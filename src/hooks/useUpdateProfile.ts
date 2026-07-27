'use client';

import { useMutation } from '@tanstack/react-query';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { useAuthStore } from '@/stores/auth.store';
import type { UpdateProfileFormValues } from '@/lib/validators/auth.validators';

/** Updates the signed-in user's profile and syncs the result into the auth store. */
export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: (values: UpdateProfileFormValues) => authApi.updateProfile(values),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
  });

  return {
    updateProfile: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.error ? getApiErrorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}
