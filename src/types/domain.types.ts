/**
 * Domain models used throughout the app (camelCase), decoupled from the
 * backend's PascalCase wire format defined in `api.types.ts`.
 */

/** Mirrors the backend RBAC roles exactly. */
export const USER_ROLES = ['SystemAdmin', 'ProjectAdmin', 'User', 'Guest'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  countryId: string | null;
  role: UserRole;
}

/**
 * Result of `/Auth/CreateUser` - deliberately lighter than `AuthenticatedUser`:
 * the backend response for a freshly created user carries no `role` or
 * `countryId` field (see `CreateUserResponseDto` in api.types.ts), and there
 * is no reliable way to resolve the submitted `RoleId` GUID to a role name
 * client-side, so those fields are not fabricated here.
 */
export interface CreatedUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  clientName: string | null;
  clientEmail: string | null;
  startDate: string | null;
  endDate: string | null;
  maxDailyHours: number | null;
  isActive: boolean;
}

/** A user resource assigned to a project - see `GET /Project/GetProjectAssignments/{projectId}`. */
export interface ProjectAssignment {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  resourceRoleTypeId: string;
  roleName: string;
  assignedAt: string;
  isActive: boolean;
}

/** A resource role type (e.g. "Senior Developer") - see `GET /ResourceRoleType/GetAllResourceRoleTypes`. */
export interface ResourceRoleType {
  id: string;
  name: string;
  description: string | null;
}

/**
 * A candidate user for the `/projects/:id/assignments` "unassigned users"
 * dropdown. There is no backend endpoint that lists every user (see
 * `app/api/projects/[id]/unassigned-users/route.ts`), so this is only ever
 * derived from users who appear in *some* project's assignment list.
 */
export interface UnassignedUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TimesheetPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  isLocked: boolean;
}

export interface TimesheetEntry {
  id: string;
  projectId: string;
  timesheetPeriodId: string;
  entryDate: string;
  hours: number;
  taskDescription: string | null;
  isApproved: boolean;
}

/**
 * Denormalized entry for the `/timesheets/history` table - includes the
 * user/project display names `GetAllTimesheetEntries` returns inline, so the
 * page doesn't need a second request to join against the Project/User list.
 */
export interface TimesheetHistoryEntry {
  id: string;
  userId: string;
  userName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  entryDate: string;
  hours: number;
  taskDescription: string | null;
  isApproved: boolean;
  approvedAt: string | null;
}

/** Combined read model behind the `/timesheets` weekly grid - see `app/api/timesheets/week/route.ts`. */
export interface TimesheetWeek {
  weekStart: string;
  weekEnd: string;
  period: TimesheetPeriod | null;
  projects: Project[];
  entries: TimesheetEntry[];
}

/**
 * Report domain models, behind the `/reports/*` screens
 * (`docs/HR_System_FE_wireframe.pdf`). All three reports are read/export
 * only - there is no create/update/delete for a report itself, only for the
 * timesheet/project/rate-card data they summarize.
 */

export interface ReportUserRef {
  id: string;
  fullName: string;
  employeeId: string | null;
}

export interface ReportProjectRef {
  id: string;
  code: string;
  name: string;
}

/** A single row behind the `/reports/timesheet` filter bar + data table. */
export interface TimesheetReportItem {
  user: ReportUserRef;
  project: ReportProjectRef;
  entryDate: string;
  hours: number;
  taskDescription: string | null;
  isApproved: boolean;
}

export interface TimesheetReport {
  reportGeneratedAt: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalCount: number;
  page: number;
  pageSize: number;
  items: TimesheetReportItem[];
}

export interface UserRolesSummaryRow {
  resourceRoleType: { id: string; name: string };
  totalHours: number;
  userCount: number;
}

/** Behind the `/reports/roles-summary` summary table + horizontal bar chart placeholder. */
export interface UserRolesSummary {
  startDate: string;
  endDate: string;
  summary: UserRolesSummaryRow[];
  grandTotalHours: number;
}

/** Per-resource-role-type line within a project's cost/revenue breakdown. */
export interface CostRevenueBreakdownRow {
  resourceRoleType: string;
  hours: number;
  costRate: number;
  billingRate: number;
  cost: number;
  revenue: number;
}

export interface CostRevenueProject {
  project: ReportProjectRef;
  totalHours: number;
  totalCost: number;
  totalRevenue: number;
  margin: number;
  breakdown: CostRevenueBreakdownRow[];
}

/** Behind the `/reports/cost-revenue` KPI cards + cost/revenue table + chart placeholder. */
export interface MonthlyCostRevenueReport {
  year: number;
  month: number;
  currency: { id: string; code: string; symbol: string };
  projects: CostRevenueProject[];
}
