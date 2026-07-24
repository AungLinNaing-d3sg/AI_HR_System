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
 * An assignable account role (e.g. "SystemAdmin") - see `GET /Auth/GetRoles`.
 * Populates the `RoleId` dropdown on the Create User form, replacing manual
 * GUID entry.
 */
export interface Role {
  id: string;
  name: string;
  description: string | null;
}

/**
 * A user account as surfaced to the browser by two distinct BFF routes that
 * both map from the backend's PascalCase Auth user shape: the `SystemAdmin`
 * `/admin/users` management table (paginated `GET /Auth/GetUserList`, see
 * `app/api/auth/users/route.ts`) and the searchable "Add User to Project"
 * combobox on `/projects/:id/assignments` (free-text `GET /Auth/SearchUsers`,
 * see `app/api/auth/search-users/route.ts` and `useUserSearch`) - every user
 * account in the system, not filtered by current project assignment (unlike
 * the now-removed `/Auth/GetUnassignedUsers` endpoint this app previously
 * used for that same dropdown).
 */
export interface UserListItem {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * A row on the `SystemAdmin`-only `/admin/users` management table
 * (`docs/HR_System_FE_wireframe.pdf`) - the same backend account as
 * `UserListItem`, but additionally carrying the `username`/`employeeId`/
 * `roleName`/country/active-status fields the latest `GET /Auth/GetUserList`
 * contract now returns (see `UserListItemDto` in `api.types.ts`), used for
 * this table's Role/Country/Status columns and its row-level Edit/
 * Activate-Deactivate actions (`PUT /Auth/UpdateUser/{id}`). Kept distinct
 * from `UserListItem` (the lighter "Add User to Project" combobox model)
 * since that surface still only needs a name and email.
 */
export interface AdminUserListItem {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  /** `null` when the backend doesn't return a confirmed role for this row. */
  roleName: string | null;
  countryId: string | null;
  countryCode: string | null;
  countryName: string | null;
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

/**
 * Invoice domain models, behind the `/invoices*` screens
 * (`docs/HR_System_FE_wireframe.pdf`). Mirrors the backend RBAC-adjacent
 * lifecycle documented for `/Invoice/*` in
 * docs/HR_System_BE.postman_collection.json: a `Draft` invoice can be
 * `Update`d/`Delete`d/`Send`-transitioned to `Sent`; a `Sent` invoice can be
 * marked `Paid`; `Void`/`Cancel` apply "regardless of current status" per the
 * documented endpoint descriptions. There is no `Finalized` status in the
 * real API (unlike the wireframe's hardcoded-JSON prototype, which invented
 * one) - see `lib/constants/invoice.constants.ts`.
 */
export const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Void', 'Cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceProjectRef {
  id: string;
  code: string;
  name: string;
}

export interface InvoiceCurrencyRef {
  code: string;
  symbol: string;
}

export interface InvoiceCurrencyDetail extends InvoiceCurrencyRef {
  id: string;
}

/** A single row on the `/invoices` table - see `GET /Invoice/GetAllInvoices`. */
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  project: InvoiceProjectRef;
  clientName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currency: InvoiceCurrencyRef;
  totalAmount: number;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
}

/** A single billable line on an invoice - see `GET /Invoice/GetInvoiceById/{id}`'s `LineItems`. */
export interface InvoiceLineItem {
  id: string;
  user: { id: string; fullName: string; employeeId: string | null };
  resourceRoleType: { id: string; name: string };
  timesheetEntryId: string;
  description: string | null;
  hours: number;
  unitRate: number;
  amount: number;
}

/** Full invoice detail behind `/invoices/[id]` - see `GET /Invoice/GetInvoiceById/{id}`. */
export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  project: InvoiceProjectRef;
  clientName: string;
  clientEmail: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currency: InvoiceCurrencyDetail;
  exchangeRate: number;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  notes: string | null;
  lineItems: InvoiceLineItem[];
  createdAt: string;
}

/**
 * Result of `POST /Invoice/GenerateInvoice` - deliberately lighter than
 * `InvoiceDetail` (no `LineItems` array, only a `lineItemCount`), matching
 * what the backend's documented example response actually returns.
 */
export interface GeneratedInvoice {
  id: string;
  invoiceNumber: string;
  projectId: string;
  projectName: string;
  clientName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  currency: InvoiceCurrencyRef;
  exchangeRate: number;
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  lineItemCount: number;
}

/** A supported billing currency - see `GET /Currency/GetAllCurrencies`. Backs the invoice currency dropdown. */
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBaseCurrency: boolean;
  isActive: boolean;
}

/** The currency on one side of an `ExchangeRate` pair - see `GET /ExchangeRate/GetAllExchangeRates`. */
export interface ExchangeRateCurrencyRef {
  id: string;
  code: string;
  symbol: string;
}

/**
 * A conversion rate from one currency to another - see
 * `GET /ExchangeRate/GetAllExchangeRates`. Backs `/admin/exchange-rates`
 * (`docs/HR_System_FE_wireframe.pdf`): currency summary cards + a
 * From/To/Rate/Effective date table, always shown FROM the current base
 * currency (e.g. SGD -> USD, SGD -> INR) - used to convert invoice totals
 * when an invoice's currency differs from the base currency.
 */
export interface ExchangeRate {
  id: string;
  fromCurrency: ExchangeRateCurrencyRef;
  toCurrency: ExchangeRateCurrencyRef;
  rate: number;
  effectiveDate: string;
  isActive: boolean;
}

/**
 * A supported country (e.g. "Singapore") - see `GET /Country/GetAllCountries`.
 * Backs the optional Country dropdown on the Create User form (`CreateUser`
 * accepts an optional `CountryId` referencing this entity).
 */
export interface Country {
  id: string;
  code: string;
  name: string;
}

/** The country a `RateCard` applies to - see `GET /RateCard/GetAllRateCards`. */
export interface RateCardCountryRef {
  id: string;
  code: string;
  name: string;
}

/** The resource role type a `RateCard` applies to - see `GET /RateCard/GetAllRateCards`. */
export interface RateCardResourceRoleTypeRef {
  id: string;
  name: string;
}

/** The currency a `RateCard`'s rates are denominated in - see `GET /RateCard/GetAllRateCards`. */
export interface RateCardCurrencyRef {
  id: string;
  code: string;
  symbol: string;
}

/**
 * A daily billing rate for a country + resource role type combination - see
 * `GET /RateCard/GetAllRateCards`. Backs `/admin/rate-cards`
 * (`docs/HR_System_FE_wireframe.pdf`): country summary cards, a country
 * dropdown filter, and a Country/Role/Rate/Currency/Effective date table,
 * used for cost (`hourlyRate`) and invoice billing (`billingRate`)
 * calculations. A rate card's country/role/currency are fixed at creation
 * time - only the rates, effective date, and active status can change
 * afterwards (see `updateRateCardSchema`'s comment).
 */
export interface RateCard {
  id: string;
  country: RateCardCountryRef;
  resourceRoleType: RateCardResourceRoleTypeRef;
  currency: RateCardCurrencyRef;
  hourlyRate: number;
  billingRate: number;
  effectiveDate: string;
  isActive: boolean;
}
