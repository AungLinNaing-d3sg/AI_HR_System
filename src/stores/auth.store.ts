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
 * readable from client JavaScript, so persisting this snapshot carries no
 * token-exposure risk either way.
 *
 * Persisted to `localStorage` (not `sessionStorage`): the backend has no
 * "get current user" endpoint (see docs/HR_System_BE.postman_collection.json
 * - only `Auth/Login` returns the full profile), so this snapshot is the
 * *only* client-side source of the signed-in user's role/name once past the
 * login page. `sessionStorage` is scoped per browser tab, so a `SystemAdmin`/
 * `ProjectAdmin` who already has a valid httpOnly session cookie (shared
 * across tabs) but opens the app in a *new* tab would still start with
 * `user: null` there - hiding role-gated `Sidebar` sections (Billing,
 * Administration) and the profile/Logout controls, which both live inside a
 * `{user && ...}` guard - until they happened to trigger a fresh `setUser`
 * call. `localStorage` is shared synchronously across every tab of the same
 * origin, so a new tab picks up the already-known profile immediately. This
 * is still safe to persist indefinitely: it's cleared on explicit logout
 * (`clearUser`, called by `useAuth().logout`) and on any `401` response from
 * this app's own BFF routes (see `lib/api/axios.ts`'s response interceptor),
 * so a fully-expired/invalidated session can't keep showing stale identity
 * chrome.
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
        typeof window !== 'undefined' ? window.localStorage : noopStorage
      ),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
