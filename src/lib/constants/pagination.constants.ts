/**
 * Pagination defaults shared by every server-side-paginated list page/table
 * in the app (Countries, Currencies, Exchange Rates, Rate Cards, Resource
 * Role Types, Invoices, Users, and the Timesheet Report). Mirrors the
 * `page`/`pageSize` (or, for the Auth domain, `PageNo`/`PageSize`) query
 * parameters documented across the `GetAll*`/`GenerateTimesheetReport`
 * endpoints in docs/HR_System_BE.postman_collection.json.
 */

/** First page, 1-indexed - matches every documented `page`/`PageNo` example (`page=1`). */
export const DEFAULT_PAGE_NO = 1;

/** Matches the `pageSize=20` default seen on most documented `GetAll*` example requests. */
export const DEFAULT_PAGE_SIZE = 20;

/** Selectable page sizes for the shared `Pagination` control's "rows per page" picker. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

/** Upper bound accepted from a client-supplied `pageSize` query param, to keep a single request cheap. */
export const MAX_PAGE_SIZE = 200;
