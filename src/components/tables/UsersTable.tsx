'use client';

import { useMemo, useState } from 'react';
import { Ban, KeyRound, Pencil, Search, UserCheck, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { usePagination } from '@/hooks/usePagination';
import { useUpdateUser } from '@/hooks/useUpdateUser';
import { useUsers } from '@/hooks/useUsers';
import { useKnownUserRolesStore } from '@/stores/knownUserRoles.store';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Pagination } from '@/components/common/Pagination';
import { ResetPasswordFormModal } from '@/components/forms/ResetPasswordFormModal';
import { UserEditFormModal } from '@/components/forms/UserEditFormModal';
import { UserRoleBadge } from '@/components/common/UserRoleBadge';
import {
  isKnownUserRoleName,
  KNOWN_USER_ROLE_NAMES,
  MIN_USER_SEARCH_QUERY_LENGTH,
  USER_ROLE_BADGE_LABELS,
  USER_SEARCH_DEBOUNCE_MS,
  type KnownUserRoleName,
} from '@/lib/constants/user.constants';
import { cn } from '@/lib/utils/cn';
import { getInitials } from '@/lib/utils/getInitials';
import type { AdminUserListItem } from '@/types/domain.types';

type RoleCounts = Record<KnownUserRoleName, number> & { unavailable: number };

/**
 * The `/admin/users` management table (`docs/HR_System_FE_wireframe.pdf`):
 * role-count chips above a User/Email/Role/Country/Status/Action table.
 *
 * `GET /Auth/GetUserList` now returns each account's `RoleName`/
 * `CountryId`/`CountryCode`/`CountryName` inline (see
 * docs/HR_System_BE.postman_collection.json and `AdminUserListItem`), so
 * this table shows the API's own role/country for every row. A row whose
 * `roleName` is still `null` (a defensive fallback, not the common case)
 * falls back to the signed-in admin's own row (from their JWT via
 * `useAuth`) or a role recorded this session by `CreateUserForm` (see
 * `stores/knownUserRoles.store.ts`), and otherwise renders "Role
 * unavailable" (see `UserRoleBadge`) instead of guessing.
 *
 * There is still no dedicated delete endpoint for a user account (unlike
 * Project/Country/Currency/RateCard) - `PUT /Auth/UpdateUser/{id}` accepts
 * an `IsActive` flag, so the row-level Action column offers Edit (opens
 * `UserEditFormModal`) and an Activate/Deactivate toggle (via
 * `useUpdateUser`, resubmitting the row's current values with only
 * `isActive` flipped) as the closest equivalent to delete/restore. The
 * signed-in admin can't deactivate their own account from here.
 *
 * The Action column also offers "Reset Password" (opens
 * `ResetPasswordFormModal`, backed by `PUT /Auth/ResetPassword/{id}` via
 * `useResetPassword`) so a `SystemAdmin` can set a new password for any
 * account without knowing its current one. If the edited/reset row is the
 * signed-in admin's own account, `useUpdateUser` also syncs the change into
 * `auth.store` so the sidebar/header immediately reflect the new name
 * instead of showing stale data until the next login.
 *
 * A search box above the table lets the signed-in `SystemAdmin` free-text
 * search every account by name/email, sourced from
 * `GET /Auth/SearchUsers?...&isAllRole=true` (see
 * `app/api/auth/users/route.ts`) rather than the paginated `GetUserList`
 * call this table otherwise uses - `isAllRole: true` so the search always
 * covers every role (`SystemAdmin`/`ProjectAdmin`/`Employee`), matching this
 * page's own `SystemAdmin`-only scope, unlike the "Add User to Project"
 * combobox's `isAllRole: false` search on `/projects/:id/assignments` (see
 * `UserSearchCombobox`/`app/api/auth/search-users/route.ts`). As-you-type
 * text is debounced (`useDebounce`/`USER_SEARCH_DEBOUNCE_MS`) and only
 * searched once it reaches `MIN_USER_SEARCH_QUERY_LENGTH`; below that
 * (including empty), the table falls back to its normal paginated listing.
 * While a search is active, the table shows that unpaginated match list
 * directly (`SearchUsers`'s response is a plain, unpaginated array) and
 * hides the page-based `Pagination` control.
 */
export function UsersTable() {
  const { user: currentUser } = useAuth();
  const roleNameByUserId = useKnownUserRolesStore((state) => state.roleNameByUserId);
  // Unpaginated - the role-count chips and the total below need every user
  // account, not just whichever ones happen to be on the table's current page.
  const { users: allUsers, totalCount, isLoading: isLoadingCounts } = useUsers();

  const { pageNo, pageSize, goToPage } = usePagination();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, USER_SEARCH_DEBOUNCE_MS);
  const trimmedSearch = debouncedSearch.trim();
  const isSearchActive = trimmedSearch.length >= MIN_USER_SEARCH_QUERY_LENGTH;
  const isSearchTermTooShort =
    searchInput.trim().length > 0 && searchInput.trim().length < MIN_USER_SEARCH_QUERY_LENGTH;

  const {
    users,
    isLoading: isLoadingPage,
    isError,
    error,
    refetch,
  } = useUsers(isSearchActive ? { search: trimmedSearch } : { pageNo, pageSize });
  const { updateUser, isUpdating, error: statusError, reset: resetStatusError } = useUpdateUser();

  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<AdminUserListItem | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<AdminUserListItem | null>(null);

  const resolveRoleName = useMemo(() => {
    return (candidate: AdminUserListItem): string | null => {
      if (candidate.roleName) return candidate.roleName;
      if (currentUser && currentUser.id === candidate.userId) {
        return currentUser.role;
      }
      return roleNameByUserId[candidate.userId] ?? null;
    };
  }, [currentUser, roleNameByUserId]);

  const roleCounts = useMemo<RoleCounts>(() => {
    const counts: RoleCounts = { SystemAdmin: 0, ProjectAdmin: 0, Employee: 0, unavailable: 0 };
    for (const candidate of allUsers) {
      const roleName = resolveRoleName(candidate);
      if (isKnownUserRoleName(roleName)) {
        counts[roleName] += 1;
      } else {
        counts.unavailable += 1;
      }
    }
    return counts;
  }, [allUsers, resolveRoleName]);

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    try {
      await updateUser({
        id: pendingStatusChange.userId,
        values: {
          username: pendingStatusChange.username,
          email: pendingStatusChange.email,
          firstName: pendingStatusChange.firstName,
          lastName: pendingStatusChange.lastName,
          employeeId: pendingStatusChange.employeeId ?? '',
          countryId: pendingStatusChange.countryId ?? '',
          isActive: !pendingStatusChange.isActive,
          roleId: '',
        },
      });
      setPendingStatusChange(null);
    } catch {
      // Surfaced via `statusError` below; keep the dialog open so the user can retry or cancel.
    }
  };

  if (isLoadingCounts) {
    return (
      <p aria-live="polite" className="text-sm text-zinc-500">
        Loading users…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert variant="error">{error ?? 'Could not load users.'}</Alert>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (allUsers.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
        <p className="text-sm text-zinc-600">No users yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        {totalCount} {totalCount === 1 ? 'user' : 'users'} across all roles.
      </p>

      <div className="flex flex-wrap items-center gap-2" aria-label="User counts by role">
        {KNOWN_USER_ROLE_NAMES.map((roleName) => (
          <span
            key={roleName}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700"
          >
            {USER_ROLE_BADGE_LABELS[roleName]}
            <span className="rounded-full bg-zinc-900/10 px-1.5 py-px text-[10px] text-zinc-700">
              {roleCounts[roleName]}
            </span>
          </span>
        ))}
        {roleCounts.unavailable > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-500"
            title="The API does not return a role for these accounts."
          >
            Role unavailable
            <span className="rounded-full bg-zinc-900/10 px-1.5 py-px text-[10px] text-zinc-700">
              {roleCounts.unavailable}
            </span>
          </span>
        )}
      </div>

      {statusError && <Alert variant="error">{statusError}</Alert>}

      <div className="max-w-sm">
        <label htmlFor="admin-users-search" className="sr-only">
          Search users by name or email
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            id="admin-users-search"
            type="search"
            autoComplete="off"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email…"
            aria-describedby="admin-users-search-hint"
            className={cn(
              'flex h-10 w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-9 text-sm text-zinc-900 shadow-sm',
              'placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-zinc-900'
            )}
          />
          {searchInput.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p id="admin-users-search-hint" className="mt-1 text-xs text-zinc-500" aria-live="polite">
          {isSearchTermTooShort
            ? `Enter at least ${MIN_USER_SEARCH_QUERY_LENGTH} characters to search.`
            : 'Searches every role by name or email.'}
        </p>
      </div>

      {isLoadingPage ? (
        <p aria-live="polite" className="text-sm text-zinc-500">
          {isSearchActive ? 'Searching…' : 'Loading users…'}
        </p>
      ) : isSearchActive && users.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-sm text-zinc-600">No users found matching &ldquo;{trimmedSearch}&rdquo;.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">
              List of user accounts with their role, country, and status.
            </caption>
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  User
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Role(s)
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Country
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((candidate) => {
                const isSelf = currentUser?.id === candidate.userId;
                return (
                  <tr key={candidate.userId}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700"
                        >
                          {getInitials(candidate.firstName, candidate.lastName)}
                        </span>
                        <span className="font-medium text-zinc-900">
                          {candidate.firstName} {candidate.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{candidate.email}</td>
                    <td className="px-4 py-3">
                      <UserRoleBadge roleName={resolveRoleName(candidate)} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {candidate.countryName ?? candidate.countryCode ?? (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          candidate.isActive
                            ? 'inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'
                            : 'inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700'
                        }
                      >
                        {candidate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(candidate)}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setResettingPasswordUser(candidate)}
                        >
                          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                          Reset Password
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSelf}
                          title={isSelf ? 'You cannot deactivate your own account.' : undefined}
                          onClick={() => {
                            resetStatusError();
                            setPendingStatusChange(candidate);
                          }}
                        >
                          {candidate.isActive ? (
                            <>
                              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isSearchActive && (
        <Pagination
          pageNo={pageNo}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={goToPage}
          isLoading={isLoadingPage}
          itemLabel="users"
        />
      )}

      <UserEditFormModal
        open={editingUser !== null}
        user={editingUser ?? undefined}
        onSuccess={() => setEditingUser(null)}
        onClose={() => setEditingUser(null)}
      />

      <ResetPasswordFormModal
        open={resettingPasswordUser !== null}
        user={resettingPasswordUser ?? undefined}
        onSuccess={() => setResettingPasswordUser(null)}
        onClose={() => setResettingPasswordUser(null)}
      />

      <ConfirmDialog
        open={pendingStatusChange !== null}
        title={pendingStatusChange?.isActive ? 'Deactivate user' : 'Activate user'}
        description={
          pendingStatusChange
            ? pendingStatusChange.isActive
              ? `Are you sure you want to deactivate "${pendingStatusChange.firstName} ${pendingStatusChange.lastName}"? They will no longer be able to sign in.`
              : `Are you sure you want to reactivate "${pendingStatusChange.firstName} ${pendingStatusChange.lastName}"?`
            : ''
        }
        confirmLabel={pendingStatusChange?.isActive ? 'Deactivate' : 'Activate'}
        isConfirming={isUpdating}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setPendingStatusChange(null)}
      />
    </div>
  );
}
