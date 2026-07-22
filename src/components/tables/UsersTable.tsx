'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useKnownUserRolesStore } from '@/stores/knownUserRoles.store';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { UserRoleBadge } from '@/components/common/UserRoleBadge';
import {
  isKnownUserRoleName,
  KNOWN_USER_ROLE_NAMES,
  USER_ROLE_BADGE_LABELS,
  type KnownUserRoleName,
} from '@/lib/constants/user.constants';
import { getInitials } from '@/lib/utils/getInitials';
import type { UserListItem } from '@/types/domain.types';

type RoleCounts = Record<KnownUserRoleName, number> & { unavailable: number };

/**
 * The `/admin/users` management table (`docs/HR_System_FE_wireframe.pdf`):
 * role-count chips above a User/Email/Role/Status table.
 *
 * `GET /Auth/GetUserList` - the only endpoint that lists every account -
 * does not return each account's role (see
 * docs/HR_System_BE.postman_collection.json), so this component only ever
 * shows a confirmed role badge for two cases: the signed-in admin's own row
 * (their role comes from their JWT via `useAuth`) and any user created
 * during the current browser session (recorded in
 * `stores/knownUserRoles.store.ts` by `CreateUserForm`). Every other row -
 * and its contribution to the count chips - is grouped under "Role
 * unavailable" instead of guessing, since misrepresenting an RBAC-sensitive
 * fact would be worse than admitting the data isn't available yet.
 *
 * Likewise, there is no "deactivate a user" endpoint in the Auth domain
 * (unlike Project/Country/Currency/RateCard), so every listed account is, in
 * fact, active - the Status column is a static, accurate "Active" badge
 * rather than a toggle the API can't support.
 */
export function UsersTable() {
  const { user: currentUser } = useAuth();
  const roleNameByUserId = useKnownUserRolesStore((state) => state.roleNameByUserId);
  const { users, totalCount, isLoading, isError, error, refetch } = useUsers();

  const resolveRoleName = useMemo(() => {
    return (candidate: UserListItem): string | null => {
      if (currentUser && currentUser.id === candidate.userId) {
        return currentUser.role;
      }
      return roleNameByUserId[candidate.userId] ?? null;
    };
  }, [currentUser, roleNameByUserId]);

  const roleCounts = useMemo<RoleCounts>(() => {
    const counts: RoleCounts = { SystemAdmin: 0, ProjectAdmin: 0, Employee: 0, unavailable: 0 };
    for (const candidate of users) {
      const roleName = resolveRoleName(candidate);
      if (isKnownUserRoleName(roleName)) {
        counts[roleName] += 1;
      } else {
        counts.unavailable += 1;
      }
    }
    return counts;
  }, [users, resolveRoleName]);

  if (isLoading) {
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

  if (users.length === 0) {
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

      {totalCount > users.length && (
        <Alert variant="info">
          Showing the first {users.length} of {totalCount} users.
        </Alert>
      )}

      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">List of user accounts with their role and status.</caption>
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
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((candidate) => (
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
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
