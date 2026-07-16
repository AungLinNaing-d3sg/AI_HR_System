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
