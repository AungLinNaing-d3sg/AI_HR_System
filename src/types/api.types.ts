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

/** Raw payload for `GET /Auth/GetRoles` - reference data for the Create User role dropdown. */
export interface RoleDto {
  Id: string;
  Name: string;
  Description: string | null;
}

export type GetRolesResponse = RoleDto[];

/**
 * Raw payload for `GET /Auth/GetUnassignedUsers` - every user with no
 * current project assignment. Global (no `projectId` path param), unlike
 * the per-project `/Project/GetProjectAssignments/{projectId}` derivation
 * this app previously combined across every project to fake an
 * "unassigned users" list (see `app/api/auth/unassigned-users/route.ts`).
 */
export interface UnassignedUserDto {
  UserId: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  EmployeeId: string | null;
}

export type GetUnassignedUsersResponse = UnassignedUserDto[];

/** Shape returned by `GET /api/auth/roles` to the browser. */
export interface RoleListResponsePayload {
  roles: import('./domain.types').Role[];
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

/**
 * Raw Report domain payloads as returned by the backend (see the `Report`
 * folder in docs/HR_System_BE.postman_collection.json's documented example
 * responses for `GenerateTimesheetReport`/`GenerateUserRolesSummary`/
 * `GenerateMonthlyCostRevenue`). The `Export*` counterparts return a raw
 * file (xlsx/csv), not JSON, and so have no DTO here - see
 * `reportsBackend.api.ts`'s `ExportedReportFile`.
 */
export interface ReportUserDto {
  Id: string;
  FullName: string;
  EmployeeId: string | null;
}

export interface ReportProjectDto {
  Id: string;
  Code: string;
  Name: string;
}

export interface TimesheetReportItemDto {
  User: ReportUserDto;
  Project: ReportProjectDto;
  EntryDate: string;
  Hours: number;
  TaskDescription: string | null;
  IsApproved: boolean;
}

export interface TimesheetReportResponseDto {
  ReportGeneratedAt: string;
  StartDate: string;
  EndDate: string;
  TotalHours: number;
  TotalCount: number;
  Page: number;
  PageSize: number;
  Items: TimesheetReportItemDto[];
}

export interface ResourceRoleTypeRefDto {
  Id: string;
  Name: string;
}

export interface UserRolesSummaryRowDto {
  ResourceRoleType: ResourceRoleTypeRefDto;
  TotalHours: number;
  UserCount: number;
}

export interface UserRolesSummaryResponseDto {
  StartDate: string;
  EndDate: string;
  Summary: UserRolesSummaryRowDto[];
  GrandTotalHours: number;
}

export interface ReportCurrencyDto {
  Id: string;
  Code: string;
  Symbol: string;
}

/** Per-role-type line within a project's `Breakdown` - note there is no per-resource(user) field, only the aggregated role. */
export interface CostRevenueBreakdownDto {
  ResourceRoleType: string;
  Hours: number;
  CostRate: number;
  BillingRate: number;
  Cost: number;
  Revenue: number;
}

export interface CostRevenueProjectDto {
  Project: ReportProjectDto;
  TotalHours: number;
  TotalCost: number;
  TotalRevenue: number;
  Margin: number;
  Breakdown: CostRevenueBreakdownDto[];
}

export interface MonthlyCostRevenueResponseDto {
  Year: number;
  Month: number;
  Currency: ReportCurrencyDto;
  Projects: CostRevenueProjectDto[];
}

/** Shape returned by `GET /api/reports/timesheet`. */
export interface TimesheetReportResponsePayload {
  report: import('./domain.types').TimesheetReport;
}

/** Shape returned by `GET /api/reports/roles-summary`. */
export interface UserRolesSummaryResponsePayload {
  summary: import('./domain.types').UserRolesSummary;
}

/** Shape returned by `GET /api/reports/cost-revenue`. */
export interface MonthlyCostRevenueResponsePayload {
  report: import('./domain.types').MonthlyCostRevenueReport;
}

/**
 * Raw Invoice domain payloads as returned by the backend (see the `Invoice`
 * folder in docs/HR_System_BE.postman_collection.json's documented example
 * responses). `GenerateInvoice`'s response and `GetAllInvoices`'s list items
 * are both deliberately lighter than `GetInvoiceById`'s full detail (no
 * `LineItems` array) - modeled here as distinct DTOs rather than one
 * "everything optional" shape, matching the DTO-per-endpoint convention used
 * throughout this file (e.g. `ApproveTimesheetEntryResponseDto` vs the full
 * `TimesheetEntryDto`).
 */
export interface InvoiceProjectRefDto {
  Id: string;
  Code: string;
  Name: string;
}

export interface InvoiceCurrencyRefDto {
  Code: string;
  Symbol: string;
}

export interface InvoiceCurrencyDetailDto extends InvoiceCurrencyRefDto {
  Id: string;
}

export interface GenerateInvoiceRequest {
  ProjectId: string;
  BillingPeriodStart: string;
  BillingPeriodEnd: string;
  CurrencyId: string;
  ClientName: string;
  ClientEmail?: string | null;
  IssuedDate: string;
  DueDate: string;
  Notes?: string | null;
}

/** Raw response `Data` for `POST /Invoice/GenerateInvoice`, verified against the documented example response. */
export interface GenerateInvoiceResponseDto {
  Id: string;
  InvoiceNumber: string;
  ProjectId: string;
  ProjectName: string;
  ClientName: string;
  BillingPeriodStart: string;
  BillingPeriodEnd: string;
  Currency: InvoiceCurrencyRefDto;
  ExchangeRate: number;
  SubTotal: number;
  TaxAmount: number;
  TotalAmount: number;
  Status: import('./domain.types').InvoiceStatus;
  LineItemCount: number;
}

/** A single row within `GetAllInvoices`'s `Items`, verified against the documented example response. */
export interface InvoiceListItemDto {
  Id: string;
  InvoiceNumber: string;
  Project: InvoiceProjectRefDto;
  ClientName: string;
  BillingPeriodStart: string;
  BillingPeriodEnd: string;
  Currency: InvoiceCurrencyRefDto;
  TotalAmount: number;
  Status: import('./domain.types').InvoiceStatus;
  IssuedDate: string;
  DueDate: string;
}

export interface InvoiceListResponseDto {
  Items: InvoiceListItemDto[];
  TotalCount: number;
  Page: number;
  PageSize: number;
}

export interface InvoiceLineItemUserDto {
  Id: string;
  FullName: string;
  EmployeeId: string | null;
}

export interface InvoiceLineItemRoleDto {
  Id: string;
  Name: string;
}

export interface InvoiceLineItemDto {
  Id: string;
  User: InvoiceLineItemUserDto;
  ResourceRoleType: InvoiceLineItemRoleDto;
  TimesheetEntryId: string;
  Description: string | null;
  Hours: number;
  UnitRate: number;
  Amount: number;
}

/** Raw response `Data` for `GET /Invoice/GetInvoiceById/{id}`, verified against the documented example response. */
export interface InvoiceDetailDto {
  Id: string;
  InvoiceNumber: string;
  Project: InvoiceProjectRefDto;
  ClientName: string;
  ClientEmail: string | null;
  BillingPeriodStart: string;
  BillingPeriodEnd: string;
  Currency: InvoiceCurrencyDetailDto;
  ExchangeRate: number;
  SubTotal: number;
  TaxAmount: number;
  TotalAmount: number;
  Status: import('./domain.types').InvoiceStatus;
  IssuedDate: string;
  DueDate: string;
  Notes: string | null;
  LineItems: InvoiceLineItemDto[];
  CreatedAt: string;
}

/** Mirrors the backend's `UpdateInvoice` request DTO - all fields optional per its documented description. */
export interface UpdateInvoiceRequest {
  CurrencyId?: string;
  ClientName?: string;
  ClientEmail?: string | null;
  IssuedDate?: string;
  DueDate?: string;
  Notes?: string | null;
}

/**
 * Raw response `Data` for `PUT /Invoice/UpdateInvoice/{id}`, verified against
 * the documented example response - a partial confirmation only (no
 * `Project`/`Currency`/`LineItems`), not the full invoice.
 */
export interface UpdateInvoiceResponseDto {
  Id: string;
  InvoiceNumber: string;
  ClientName: string;
  ClientEmail: string | null;
  IssuedDate: string;
  DueDate: string;
  Notes: string | null;
  Status: import('./domain.types').InvoiceStatus;
}

/**
 * Raw response `Data` shape shared by `SendInvoice`/`MarkInvoicePaid`/
 * `VoidInvoice`/`CancelInvoice`, verified against their documented example
 * responses - each is a partial `{Id, Status}` confirmation only.
 */
export interface InvoiceStatusChangeResponseDto {
  Id: string;
  Status: import('./domain.types').InvoiceStatus;
}

/** `DeleteInvoice` returns `Data: null` on success, verified against the documented example response. */
export type DeleteInvoiceResponse = null;

/** Shape returned by `GET /api/invoices`. */
export interface InvoiceListResponsePayload {
  invoices: import('./domain.types').InvoiceSummary[];
  totalCount: number;
}

/** Shape returned by `POST /api/invoices` and `GET /api/invoices/:id`. */
export interface GeneratedInvoiceResponsePayload {
  invoice: import('./domain.types').GeneratedInvoice;
}

export interface InvoiceResponsePayload {
  invoice: import('./domain.types').InvoiceDetail;
}

/**
 * Shape returned by `PUT /api/invoices/:id` - deliberately lighter than
 * `InvoiceResponsePayload`, mirroring `UpdateInvoiceResponseDto`'s own
 * partial shape (see above). Callers refetch `['invoices', 'detail', id]`
 * to see the full updated invoice.
 */
export interface InvoiceUpdateResponsePayload {
  invoice: {
    id: string;
    invoiceNumber: string;
    clientName: string;
    clientEmail: string | null;
    issuedDate: string;
    dueDate: string;
    notes: string | null;
    status: import('./domain.types').InvoiceStatus;
  };
}

/** Shape returned by `PUT /api/invoices/:id/send`, `/mark-paid`, `/void`, and `/cancel`. */
export interface InvoiceStatusResponsePayload {
  id: string;
  status: import('./domain.types').InvoiceStatus;
}

/**
 * Raw payload for `GET /Currency/GetAllCurrencies`, verified against the
 * documented example response - paginated, like `ResourceRoleTypeListResponse`.
 */
export interface CurrencyDto {
  Id: string;
  Code: string;
  Name: string;
  Symbol: string;
  IsBaseCurrency: boolean;
  IsActive: boolean;
  CreatedAt: string;
}

export interface CurrencyListResponseDto {
  Items: CurrencyDto[];
  TotalCount: number;
  Page: number;
  PageSize: number;
}

/** Shape returned by `GET /api/currencies`. */
export interface CurrencyListResponsePayload {
  currencies: import('./domain.types').Currency[];
}
