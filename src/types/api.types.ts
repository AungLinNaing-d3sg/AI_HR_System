/**
 * Request/response DTOs for the Auth domain, mirroring the backend contract
 * exactly (PascalCase field names) as documented in
 * docs/HR_System_BE.postman_collection.json.
 *
 * Backend serializes with `PropertyNamingPolicy = null`, so these shapes are
 * intentionally PascalCase to match the wire format. Client-facing code
 * should map these into the camelCase domain models in `domain.types.ts`
 * before handing data to components/hooks.
 */

import type { UserRole } from './domain.types';

/**
 * Raw user payload assumed for `/Auth/CreateUser` - unverified against the
 * live backend (creating a throwaway user to inspect the real shape would
 * pollute real backend data). `Login`/`UpdateProfile` shapes below are
 * verified against the live backend and are flatter than this.
 */
export interface AuthUserDto {
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  EmployeeId: string | null;
  CountryId: string | null;
  RoleId: string;
  RoleName: UserRole;
}

export interface LoginRequest {
  UsernameOrEmail: string;
  Password: string;
}

/** Verified against the live backend: flat fields, no nested `User`, plural `Roles`. */
export interface LoginResponse {
  AccessToken: string;
  RefreshToken: string;
  ExpiresAt: string;
  UserId: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Roles: string[];
}

export interface RefreshTokenRequest {
  RefreshToken: string;
}

export interface RefreshTokenResponse {
  AccessToken: string;
  RefreshToken: string;
  ExpiresAt: string;
}

export interface LogoutRequest {
  RefreshToken: string;
}

export interface UpdateProfileRequest {
  FirstName: string;
  LastName: string;
  Email: string;
  CountryId?: string | null;
}

/** Verified against the live backend: no role fields, no `EmployeeId`. */
export interface UpdateProfileResponse {
  UserId: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  CountryId: string | null;
}

export interface ChangePasswordRequest {
  CurrentPassword: string;
  NewPassword: string;
  ConfirmNewPassword: string;
}

export interface CreateUserRequest {
  Username: string;
  Email: string;
  Password: string;
  FirstName: string;
  LastName: string;
  EmployeeId?: string | null;
  CountryId?: string | null;
  RoleId: string;
}

export type CreateUserResponse = AuthUserDto;

/** Shape of error bodies returned by the backend (best-effort, defensive). */
export interface ApiErrorResponse {
  Message?: string;
  Errors?: Record<string, string[]>;
  StatusCode?: number;
}

/** Shape returned by this app's own BFF route handlers to the browser. */
export interface AuthResponsePayload {
  user: import('./domain.types').AuthenticatedUser;
}

/**
 * Raw project payload as returned by the backend
 * (`docs/HR_System_BE.postman_collection.json` does not include a response
 * body example for any `/Project/*` endpoint, so this shape is inferred from
 * the `CreateProject`/`UpdateProject` request bodies plus the same
 * PascalCase/nullable-optional-field conventions used by `AuthUserDto`).
 */
export interface ProjectDto {
  Id: string;
  Code: string;
  Name: string;
  Description: string | null;
  ClientName: string | null;
  ClientEmail: string | null;
  StartDate: string | null;
  EndDate: string | null;
  MaxDailyHours: number | null;
  IsActive: boolean;
}

export interface CreateProjectRequest {
  Code: string;
  Name: string;
  Description?: string | null;
  ClientName?: string | null;
  ClientEmail?: string | null;
  StartDate?: string | null;
  EndDate?: string | null;
  MaxDailyHours?: number | null;
}

export interface UpdateProjectRequest {
  Code: string;
  Name: string;
  Description?: string | null;
  ClientName?: string | null;
  ClientEmail?: string | null;
  StartDate?: string | null;
  EndDate?: string | null;
  MaxDailyHours?: number | null;
  IsActive?: boolean;
}

export type ProjectListResponse = ProjectDto[];
export type ProjectResponse = ProjectDto;

/** Shapes returned by this app's own BFF route handlers to the browser. */
export interface ProjectResponsePayload {
  project: import('./domain.types').Project;
}

export interface ProjectListResponsePayload {
  projects: import('./domain.types').Project[];
}

/**
 * Raw Timesheet Period/Entry payloads as returned by the backend (see
 * docs/HR_System_BE.postman_collection.json's `TimesheetPeriod`/
 * `TimesheetEntry` request/response examples).
 */
export interface TimesheetPeriodDto {
  Id: string;
  PeriodStart: string;
  PeriodEnd: string;
  IsLocked: boolean;
}

export interface TimesheetEntryDto {
  Id: string;
  UserId: string;
  ProjectId: string;
  TimesheetPeriodId: string;
  EntryDate: string;
  Hours: number;
  TaskDescription: string | null;
  IsApproved: boolean;
}

export interface CreateTimesheetEntryRequest {
  ProjectId: string;
  TimesheetPeriodId: string;
  EntryDate: string;
  Hours: number;
  TaskDescription?: string | null;
}

export interface UpdateTimesheetEntryRequest {
  Hours: number;
  TaskDescription?: string | null;
}

export type TimesheetPeriodListResponse = TimesheetPeriodDto[];
export type TimesheetEntryListResponse = TimesheetEntryDto[];
export type TimesheetEntryResponse = TimesheetEntryDto;

/** Shapes returned by this app's own BFF route handlers to the browser. */
export interface TimesheetEntryResponsePayload {
  entry: import('./domain.types').TimesheetEntry;
}

/** Combined read model behind `GET /api/timesheets/week` - see `app/api/timesheets/week/route.ts`. */
export type TimesheetWeekResponsePayload = import('./domain.types').TimesheetWeek;
