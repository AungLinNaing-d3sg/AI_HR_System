'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as authApi from '@/lib/api/auth.api';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { useAuthStore } from '@/stores/auth.store';
import type { LoginFormValues } from '@/lib/validators/auth.validators';

/**
 * Client-side session/identity hook. Wraps the Auth domain API module in
 * TanStack Query mutations (loading/error state) and keeps the Zustand
 * `auth.store` in sync with the result. Components should read `user`/
 * `role`/`isAuthenticated` from here rather than importing the store
 * directly, and call `login`/`logout` rather than `lib/api/auth.api`
 * directly.
 */
export function useAuth() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => authApi.login(values),
    onSuccess: (authenticatedUser) => {
      setUser(authenticatedUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearUser();
      router.push('/login');
    },
  });

  return {
    user,
    role: user?.role ?? null,
    isAuthenticated: Boolean(user),
    hasHydrated,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error ? getApiErrorMessage(loginMutation.error) : null,
    resetLoginError: loginMutation.reset,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
