/**
 * Admin "Users" domain constants (`/admin/users`), shared between the
 * Route Handler, the client API module, and the `UsersTable`/`UserRoleBadge`
 * UI. Mirrors the real `/Auth/*` contract documented in
 * docs/HR_System_BE.postman_collection.json.
 */

/**
 * `GET /Auth/GetUserList` is paginated (`PageNo`/`PageSize`), but the
 * wireframe's `/admin/users` screen (`docs/HR_System_FE_wireframe.pdf`) shows
 * a plain, unpaginated table - matching the same choice already made for the
 * Invoice domain (see `INVOICE_LIST_PAGE_SIZE`), this app requests one large
 * page instead of building pagination UI the design doesn't call for.
 */
export const USERS_PAGE_SIZE = 100;

/**
 * The three backend Auth roles that `GET /Auth/GetRoles` returns today
 * (`SystemAdmin`, `ProjectAdmin`, `Employee`). Order matches the wireframe's
 * role-count chips row.
 */
export const KNOWN_USER_ROLE_NAMES = ['SystemAdmin', 'ProjectAdmin', 'Employee'] as const;
export type KnownUserRoleName = (typeof KNOWN_USER_ROLE_NAMES)[number];

/** Wireframe labels - "Employee" (the backend's role name) reads as "Assigned User" in the UI. */
export const USER_ROLE_BADGE_LABELS: Record<KnownUserRoleName, string> = {
  SystemAdmin: 'System Admin',
  ProjectAdmin: 'Project Admin',
  Employee: 'Assigned User',
};

/**
 * Badge colors exactly as specified by the feature brief and the wireframe's
 * `/admin/users` screen: System Admin = yellow, Project Admin = green,
 * Assigned User = grey.
 */
export const USER_ROLE_BADGE_CLASSNAMES: Record<KnownUserRoleName, string> = {
  SystemAdmin: 'bg-yellow-100 text-yellow-800',
  ProjectAdmin: 'bg-green-100 text-green-800',
  Employee: 'bg-zinc-200 text-zinc-700',
};

export function isKnownUserRoleName(value: string | null | undefined): value is KnownUserRoleName {
  return typeof value === 'string' && (KNOWN_USER_ROLE_NAMES as readonly string[]).includes(value);
}

/**
 * Shared by the searchable "Add User to Project" combobox on
 * `/projects/:id/assignments` (`UserSearchCombobox`, `useUserSearch`,
 * `useDebounce`) and `GET /api/auth/search-users`'s query validation
 * (`searchUsersQuerySchema`) - the as-you-type query text must reach this
 * length, after the debounce below elapses, before a `GET /Auth/SearchUsers`
 * request fires. Keeps the backend from being hit on every keystroke or with
 * an overly broad 1-character search.
 */
export const MIN_USER_SEARCH_QUERY_LENGTH = 2;

/** How long the combobox waits after the last keystroke before searching. */
export const USER_SEARCH_DEBOUNCE_MS = 300;
