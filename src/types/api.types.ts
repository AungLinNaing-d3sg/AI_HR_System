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

/**
 * Raw response `Data` for `/Auth/CreateUser`, verified against the
 * documented example response in
 * docs/HR_System_BE.postman_collection.json: flat fields, no `Id` (it's
 * `UserId`), and no `RoleId`/`RoleName`/`CountryId` despite those being
 * present on the request body.
 */
export interface CreateUserResponseDto {
  UserId: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  EmployeeId: string | null;
}

export type CreateUserResponse = CreateUserResponseDto;

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

/** Shape returned by `POST /api/auth/users` to the browser - see `CreatedUser`. */
export interface CreateUserResponsePayload {
  user: import('./domain.types').CreatedUser;
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
 * Raw payload for `GET /Project/GetProjectAssignments/{projectId}`, verified
 * against the documented example response.
 */
export interface ProjectAssignmentDto {
  Id: string;
  UserId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  ResourceRoleTypeId: string;
  RoleName: string;
  AssignedAt: string;
  IsActive: boolean;
}

export type ProjectAssignmentListResponse = ProjectAssignmentDto[];

/** Mirrors the backend's `AssignResource` request DTO. */
export interface AssignResourceRequest {
  UserId: string;
  ResourceRoleTypeId: string;
}

/**
 * Raw response `Data` for `POST /Project/AssignResource/{projectId}`,
 * verified against the documented example response.
 */
export interface AssignResourceResponseDto {
  Id: string;
  ProjectId: string;
  UserId: string;
  ResourceRoleTypeId: string;
  AssignedAt: string;
}

/**
 * `DELETE /Project/RemoveResource/{projectId}/{assignmentId}` returns
 * `Data: null` on success, verified against the documented example response
 * (same pattern as `UpdateTimesheetEntryResponse`).
 */
export type RemoveResourceResponse = null;

/** Shapes returned by this app's own BFF route handlers to the browser. */
export interface ProjectAssignmentListResponsePayload {
  assignments: import('./domain.types').ProjectAssignment[];
}

export interface UnassignedUsersResponsePayload {
  users: import('./domain.types').UnassignedUser[];
}

/**
 * Raw payload for `GET /ResourceRoleType/GetAllResourceRoleTypes`, verified
 * against the documented example response - paginated, unlike the other
 * reference-data list endpoints this app calls.
 */
export interface ResourceRoleTypeDto {
  Id: string;
  Name: string;
  Description: string | null;
}

export interface ResourceRoleTypeListResponse {
  Items: ResourceRoleTypeDto[];
  TotalCount: number;
  Page: number;
  PageSize: number;
}

export interface ResourceRoleTypeListResponsePayload {
  roleTypes: import('./domain.types').ResourceRoleType[];
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
  /** Only present on `GetAllTimesheetEntries`/`GetTimesheetEntryById` - absent on `CreateTimesheetEntry`'s response. */
  UserFirstName?: string;
  UserLastName?: string;
  ProjectId: string;
  ProjectCode?: string;
  ProjectName?: string;
  TimesheetPeriodId: string;
  EntryDate: string;
  Hours: number;
  TaskDescription: string | null;
  IsApproved: boolean;
  ApprovedAt?: string | null;
  ApprovedBy?: string | null;
}

/**
 * Raw response `Data` for `PUT /TimesheetEntry/ApproveTimesheetEntry/{id}`,
 * verified against the documented example response - a partial confirmation
 * only (`Id`/`IsApproved`/`ApprovedAt`/`ApprovedBy`), not the full entry.
 */
export interface ApproveTimesheetEntryResponseDto {
  Id: string;
  IsApproved: boolean;
  ApprovedAt: string;
  ApprovedBy: string;
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

/** Mirrors the backend's `CreateTimesheetPeriod` request DTO. */
export interface CreateTimesheetPeriodRequest {
  PeriodStart: string;
  PeriodEnd: string;
}

export type TimesheetPeriodListResponse = TimesheetPeriodDto[];
export type TimesheetPeriodResponse = TimesheetPeriodDto;

/**
 * Raw response `Data` for `PUT /TimesheetPeriod/LockTimesheetPeriod/{id}`,
 * verified against the documented example response - a partial confirmation
 * only (`LockedAt`), not the full period.
 */
export interface LockTimesheetPeriodResponseDto {
  LockedAt: string;
}

/**
 * `UnlockTimesheetPeriod`/`DeleteTimesheetPeriod` both return `Data: null` on
 * success, verified against the documented example responses (same pattern
 * as `UpdateTimesheetEntryResponse`/`RemoveResourceResponse`).
 */
export type UnlockTimesheetPeriodResponse = null;
export type DeleteTimesheetPeriodResponse = null;
export type TimesheetEntryListResponse = TimesheetEntryDto[];
export type TimesheetEntryResponse = TimesheetEntryDto;

/**
 * Raw response `Data` for `PUT /TimesheetEntry/UpdateTimesheetEntry/{id}`,
 * verified against the documented example response: `null` on success, no
 * entry fields at all (unlike `CreateTimesheetEntry`, which returns the full
 * created entry).
 */
export type UpdateTimesheetEntryResponse = null;

/**
 * `DeleteTimesheetEntry` returns `Data: null` on success, verified against
 * the documented example response (same pattern as
 * `UpdateTimesheetEntryResponse`/`DeleteTimesheetPeriodResponse`).
 */
export type DeleteTimesheetEntryResponse = null;

/** Shapes returned by this app's own BFF route handlers to the browser. */
export interface TimesheetEntryResponsePayload {
  entry: import('./domain.types').TimesheetEntry;
}

/**
 * Shape returned by `PUT /api/timesheets/entries/:id` - deliberately lighter
 * than `TimesheetEntryResponsePayload` since `UpdateTimesheetEntryResponse`
 * carries no entry fields to report back; only what the caller already sent
 * is echoed.
 */
export interface TimesheetEntryUpdateResponsePayload {
  entry: {
    id: string;
    hours: number;
    taskDescription: string | null;
  };
}

/** Combined read model behind `GET /api/timesheets/week` - see `app/api/timesheets/week/route.ts`. */
export type TimesheetWeekResponsePayload = import('./domain.types').TimesheetWeek;

/** Shape returned by `GET /api/timesheets/history` - see `app/api/timesheets/history/route.ts`. */
export interface TimesheetHistoryResponsePayload {
  entries: import('./domain.types').TimesheetHistoryEntry[];
}

/** Shape returned by `PUT /api/timesheets/entries/:id/approve`. */
export interface ApproveTimesheetEntryResponsePayload {
  id: string;
  isApproved: boolean;
  approvedAt: string;
}

/** Shape returned by `GET /api/timesheets/periods`. */
export interface TimesheetPeriodListResponsePayload {
  periods: import('./domain.types').TimesheetPeriod[];
}

/** Shape returned by `POST /api/timesheets/periods`. */
export interface TimesheetPeriodResponsePayload {
  period: import('./domain.types').TimesheetPeriod;
}

/**
 * Shape returned by `PUT /api/timesheets/periods/:id/lock` - deliberately a
 * partial confirmation (not the full period), since the backend's own
 * `LockTimesheetPeriod` response is likewise partial (see
 * `LockTimesheetPeriodResponseDto`). Callers refetch the `['timesheets',
 * 'periods']` list to see the updated row.
 */
export interface TimesheetPeriodLockResponsePayload {
  id: string;
  isLocked: true;
  lockedAt: string;
}

/** Shape returned by `PUT /api/timesheets/periods/:id/unlock`. */
export interface TimesheetPeriodUnlockResponsePayload {
  id: string;
  isLocked: false;
}
