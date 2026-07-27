import { cn } from '@/lib/utils/cn';
import { isKnownUserRoleName, USER_ROLE_BADGE_CLASSNAMES, USER_ROLE_BADGE_LABELS } from '@/lib/constants/user.constants';

export interface UserRoleBadgeProps {
  /** The backend Auth role name (`SystemAdmin`/`ProjectAdmin`/`Employee`), or `null` if it isn't known. */
  roleName: string | null;
}

/**
 * Small colored role pill for the `/admin/users` table, matching the
 * wireframe's role badges (System Admin = yellow, Project Admin = green,
 * Assigned User = grey).
 *
 * `GET /Auth/GetUserList` (the only endpoint that lists every user account)
 * does not return each account's role, and there is no `GetUserById`
 * endpoint to look one up afterwards (see
 * docs/HR_System_BE.postman_collection.json) - so `roleName` is only ever
 * populated for rows this app can confirm without guessing (the signed-in
 * admin's own row, via their JWT, and any user created during the current
 * browser session, via `stores/knownUserRoles.store.ts`). Every other row
 * renders this neutral "Role unavailable" state instead of fabricating one
 * of the three colored badges, which could otherwise misrepresent a real
 * RBAC-sensitive fact.
 */
export function UserRoleBadge({ roleName }: UserRoleBadgeProps) {
  if (!isKnownUserRoleName(roleName)) {
    return (
      <span
        className="inline-flex items-center rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-500"
        title="The API does not return this user's role. Only the currently signed-in admin's own row, and users created this session, show a confirmed role."
      >
        Role unavailable
      </span>
    );
  }

  return (
    <span
      className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', USER_ROLE_BADGE_CLASSNAMES[roleName])}
    >
      {USER_ROLE_BADGE_LABELS[roleName]}
    </span>
  );
}
