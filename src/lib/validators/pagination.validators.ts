import { z } from 'zod';
import { MAX_PAGE_SIZE } from '@/lib/constants/pagination.constants';

/**
 * Shared `pageNo`/`pageSize` query-param schema for every paginated list
 * Route Handler (`GET /api/countries`, `/api/currencies`, `/api/exchange-rates`,
 * `/api/rate-cards`, `/api/resource-role-types`, `/api/invoices`,
 * `/api/auth/users`, `/api/reports/timesheet`). Validates the raw
 * `URLSearchParams` string values a GET request's Route Handler reads off
 * `request.url`, mirroring `report.validators.ts`'s pattern for that same
 * shape. Both fields are optional so a caller (e.g. a reference-data
 * dropdown) that omits them falls back to that route's own default page.
 */
export const paginationQuerySchema = z.object({
  pageNo: z.coerce.number().int('Page must be a whole number.').min(1, 'Page must be at least 1.').optional(),
  pageSize: z.coerce
    .number()
    .int('Page size must be a whole number.')
    .min(1, 'Page size must be at least 1.')
    .max(MAX_PAGE_SIZE, `Page size must be at most ${MAX_PAGE_SIZE}.`)
    .optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
