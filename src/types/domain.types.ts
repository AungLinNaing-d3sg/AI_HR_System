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

/** Combined read model behind the `/timesheets` weekly grid - see `app/api/timesheets/week/route.ts`. */
export interface TimesheetWeek {
  weekStart: string;
  weekEnd: string;
  period: TimesheetPeriod | null;
  projects: Project[];
  entries: TimesheetEntry[];
}
