import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Client-side memory of which backend Auth role (`SystemAdmin` /
 * `ProjectAdmin` / `Employee`) was assigned to a user account, keyed by
 * `userId`.
 *
 * WHY THIS EXISTS: `GET /Auth/GetUserList` - the only endpoint that lists
 * every user account - does not return each account's role, and there is no
 * `GetUserById`/"get a user's role" endpoint to look one up afterwards (see
 * docs/HR_System_BE.postman_collection.json; `types/domain.types.ts`'s
 * `CreatedUser` comment already documents this same gap for `CreateUser`'s
 * response). The one moment the frontend legitimately *knows* a specific
 * user's role - rather than guessing - is the instant a `SystemAdmin`
 * creates that account through `CreateUserForm`: the chosen `RoleId` is
 * resolved to a role name (via `useRoles`) and recorded here so the
 * `/admin/users` table can show a real, non-fabricated role badge for
 * accounts created during the current browser session. Every other
 * pre-existing account renders as "Role unavailable" (see
 * `UserRoleBadge`) instead.
 *
 * This is a documented UX workaround for a backend contract gap, not a
 * source of truth, and is never used for any authorization decision - the
 * backend remains the actual authorization boundary, per the RBAC section
 * of the Technical Requirements doc. Persisted to `sessionStorage` only (not
 * `localStorage`), so it never outlives the current browser tab.
 */
interface KnownUserRolesState {
  roleNameByUserId: Record<string, string>;
  recordUserRole: (userId: string, roleName: string) => void;
}

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useKnownUserRolesStore = create<KnownUserRolesState>()(
  persist(
    (set) => ({
      roleNameByUserId: {},
      recordUserRole: (userId, roleName) =>
        set((state) => ({
          roleNameByUserId: { ...state.roleNameByUserId, [userId]: roleName },
        })),
    }),
    {
      name: 'hr-known-user-roles',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.sessionStorage : noopStorage)),
    }
  )
);
