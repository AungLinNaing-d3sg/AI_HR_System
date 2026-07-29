import { paginationQuerySchema } from '@/lib/validators/pagination.validators';

export interface ResolvedPagination {
  pageNo: number;
  pageSize: number;
}

/**
 * Reads and validates the optional `pageNo`/`pageSize` query params off a
 * paginated list Route Handler's `URLSearchParams` (see
 * `paginationQuerySchema`), falling back to `defaults` for anything absent
 * or invalid. Used by every paginated list Route Handler (`/api/countries`,
 * `/api/currencies`, `/api/exchange-rates`, `/api/rate-cards`,
 * `/api/resource-role-types`, `/api/invoices`, `/api/auth/users`,
 * `/api/reports/timesheet`) so a malformed value (e.g. a tampered URL)
 * degrades to that route's own default page instead of failing the whole
 * request - pagination position isn't security- or data-integrity-sensitive
 * the way a mutation's request body is.
 */
export function resolvePagination(searchParams: URLSearchParams, defaults: ResolvedPagination): ResolvedPagination {
  const parsed = paginationQuerySchema.safeParse({
    pageNo: searchParams.get('pageNo') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });

  if (!parsed.success) {
    return defaults;
  }

  return {
    pageNo: parsed.data.pageNo ?? defaults.pageNo,
    pageSize: parsed.data.pageSize ?? defaults.pageSize,
  };
}
