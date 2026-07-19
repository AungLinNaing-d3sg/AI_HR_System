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

/** Matches the wireframe's "Unique, uppercase letters and hyphens" project code hint. */
export const PROJECT_CODE_REGEX = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

/** Reasonable upper bound for a single resource's billable hours in a day. */
export const MAX_DAILY_HOURS_LIMIT = 24;
