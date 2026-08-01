'use client';

import { useAuth } from '@/hooks/useAuth';
import { useMyProjects } from '@/hooks/useMyProjects';
import { useProjects } from '@/hooks/useProjects';

/**
 * Project options for the report/invoice "Project" filter & select fields -
 * `TimesheetReportTable`'s and `CostRevenueTable`'s Project filter, and
 * `GenerateInvoiceForm`'s Project select. Same role-scoped `useMyProjects`/
 * `useProjects` split as the `/projects` management table's `useProjectList`,
 * kept as a separate hook since these two call sites can evolve
 * independently.
 *
 * A `ProjectAdmin` only ever reports on/invoices their own assigned projects
 * (see `app/api/reports/timesheet/route.ts`'s `getMyTimesheetReport`/
 * `app/api/invoices/route.ts`'s `getMyInvoices` role split), so this filter's
 * project list is scoped the same way via `GET /Project/GetMyProjectList`
 * (`useMyProjects`) instead of the unscoped `GetProjectList` a `SystemAdmin`
 * (or any other role) still sees via `useProjects`. Only one of the two
 * underlying queries is `enabled` at a time, so switching roles never fires
 * both requests.
 */
export function useProjectFilterOptions() {
  const { role } = useAuth();
  const isProjectAdmin = role === 'ProjectAdmin';

  const myProjects = useMyProjects(isProjectAdmin);
  const allProjects = useProjects(!isProjectAdmin);

  return isProjectAdmin ? myProjects : allProjects;
}
