import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthenticatedUser } from '@/types/domain.types';

/**
 * Holds the *non-sensitive* authenticated user profile client-side so the
 * UI can render identity/role-aware chrome (name, role-gated nav, etc.)
 * without re-fetching it on every render.
 *
 * This deliberately never stores the access/refresh tokens - those live in
 * httpOnly cookies set by the `/api/auth/*` Route Handlers and are never
 * readable from client JavaScript. Persisting only to `sessionStorage`
 * (rather than `localStorage`) keeps this profile snapshot scoped to the
 * current browser tab/session rather than lingering indefinitely on the
 * device.
 */
interface AuthState {
  user: AuthenticatedUser | null;
  hasHydrated: boolean;
  setUser: (user: AuthenticatedUser) => void;
  clearUser: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'hr-auth-user',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.sessionStorage : noopStorage
      ),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
