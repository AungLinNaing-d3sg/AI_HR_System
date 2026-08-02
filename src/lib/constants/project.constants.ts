import type { UserRole } from '@/types/domain.types';

/**
 * Project-related constants shared between Route Handlers, `proxy.ts`,
 * `routeAccess.ts`, and the Project domain's forms/hooks.
 */

/**
 * Roles that can approve other users' timesheet entries and see everyone's
 * (not just their own) timesheet history. Project view/create/edit/delete/
 * assign is intentionally *not* gated by this list - the wireframe's own QA
 * notes (`docs/HR_System_FE_wireframe.pdf`) only call out the
 * Administration section as hidden for a plain `User`/`AssignedUser` role,
 * not Projects, and the backend's `/Project/*` endpoints are tagged only
 * `[Auth]` (no role restriction) anyway. See `TimesheetHistoryTable.tsx` and
 * `app/api/timesheets/history/route.ts` for where this is actually used.
 */
export const PROJECT_MANAGEMENT_ROLES: readonly UserRole[] = ['SystemAdmin', 'ProjectAdmin'];

/**
 * Roles whose `/projects` management table (`ProjectsTable`/`useProjectList`)
 * is scoped to only their own assigned projects, via
 * `GET /Project/GetMyProjectList` (`useMyProjects`), instead of the unscoped
 * `GetProjectList` (`useProjects`) a `SystemAdmin` (or any other role) still
 * sees. A `ProjectAdmin` only manages their own assigned projects; a plain
 * `User` (the backend's "Employee" role) likewise only works their own
 * assigned projects. Also gates `GET /api/projects/mine`
 * (`app/api/projects/mine/route.ts`), since both roles now call it. Kept
 * separate from `PROJECT_MANAGEMENT_ROLES` above, which grants broader
 * report/invoice/timesheet-approval access a plain `User` must not have.
 */
export const MY_PROJECT_LIST_ROLES: readonly UserRole[] = ['ProjectAdmin', 'User'];

/** Matches the wireframe's "Unique, uppercase letters and hyphens" project code hint. */
export const PROJECT_CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

/** Reasonable upper bound for a single resource's billable hours in a day. */
export const MAX_DAILY_HOURS_LIMIT = 24;
