import 'server-only';

import * as projectsBackend from '@/lib/api/projectsBackend.api';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import type { ProjectDto } from '@/types/api.types';

/**
 * Server-only helpers enforcing the Timesheet domain's project-scoped RBAC
 * rules (see `docs/HR_System_BE.postman_collection.json`'s `[Auth]`-only
 * tagging on `TimesheetEntry`/`TimesheetPeriod` endpoints - none of this is
 * enforced by the backend itself, so it is layered on here, consistent with
 * the existing ownership check in `app/api/timesheets/entries/[id]/route.ts`'s
 * `DELETE` handler):
 *
 * - A plain `User` only ever logs/sees their own hours, and only against
 *   projects they are actually staffed on (`filterProjectsAssignedToUser`).
 * - A `ProjectAdmin` may only view/approve/delete entries that belong to a
 *   project they are themselves assigned to (`getProjectAdminAssignedProjectIds`),
 *   never every project in the system.
 * - A `SystemAdmin` is unrestricted (full oversight), and never needs either
 *   helper below.
 */

/**
 * Narrows `projects` down to only the ones `userId` is an active resource
 * on, by cross-referencing each project's own `GetProjectAssignments` list -
 * there is no bulk "my projects" endpoint in
 * docs/HR_System_BE.postman_collection.json, only a per-project one. Used so
 * the `/timesheets` weekly grid only offers - and totals hours from - the
 * projects a user is actually staffed on, rather than every active project
 * system-wide.
 *
 * A project whose assignment lookup itself fails is excluded (fails closed)
 * rather than surfacing an error for the whole grid over one bad project.
 */
export async function filterProjectsAssignedToUser(
  projects: readonly ProjectDto[],
  userId: string,
  accessToken: string
): Promise<ProjectDto[]> {
  const flags = await Promise.all(
    projects.map(async (project) => {
      try {
        const assignments = await projectsBackend.getProjectAssignments(project.Id, accessToken);
        return assignments.some((assignment) => assignment.UserId === userId && assignment.IsActive);
      } catch {
        return false;
      }
    })
  );
  return projects.filter((_project, index) => flags[index]);
}

/**
 * The set of project ids the calling `ProjectAdmin` is allowed to view/manage
 * timesheet entries for - i.e. the projects `GetProjectAdminTimesheetSummary`
 * (scoped server-side to the caller's own assignments) reports a summary for.
 * `SystemAdmin` never needs this - it has unrestricted access.
 *
 * Only `ProjectSummaries` is read here - an aggregate unaffected by the
 * endpoint's own `Items` pagination (see `ProjectAdminTimesheetSummaryDto`'s
 * doc comment in `types/api.types.ts`) - so this requests the smallest
 * possible `Items` page rather than the standard list-page size, since the
 * paginated entries themselves are never used for this access check.
 */
export async function getProjectAdminAssignedProjectIds(accessToken: string): Promise<Set<string>> {
  const summary = await timesheetsBackend.getProjectAdminTimesheetSummary(accessToken, { pageSize: 1 });
  return new Set((summary?.ProjectSummaries ?? []).map((project) => project.ProjectId));
}
