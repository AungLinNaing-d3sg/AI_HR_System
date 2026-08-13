import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, extractUserId, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapTimesheetHistoryEntryList } from '@/lib/utils/mapTimesheet';
import { resolvePagination } from '@/lib/utils/pagination';
import type { TimesheetEntryDto, TimesheetHistoryResponsePayload } from '@/types/api.types';

/**
 * GET /api/timesheets/history?pageNo=&pageSize=
 *
 * Backs the `/timesheets/history` table (`docs/HR_System_FE_wireframe.pdf`).
 * `GetAllTimesheetEntries` is tagged only `[Auth]` in
 * docs/HR_System_BE.postman_collection.json - the backend itself does not
 * scope results to the caller - so this route applies UX-level scoping by
 * role:
 *
 * - A plain `User` only sees their own entries.
 * - A `ProjectAdmin` only sees entries for projects they are themselves
 *   assigned to, via `GetProjectAdminTimesheetSummary` (which the backend
 *   scopes server-side to the caller's own assignments) rather than the
 *   unscoped `GetAllTimesheetEntries` - "a Project Admin can only
 *   view/manage assigned project timesheets".
 * - A `SystemAdmin` sees every entry system-wide (unrestricted oversight).
 *
 * As of the latest backend contract (see
 * docs/HR_System_BE.postman_collection.json), both `GetAllTimesheetEntries`
 * and `GetProjectAdminTimesheetSummary` return the standard paginated
 * envelope (`Items`/`TotalCount`/`TotalPages`/`PageNo`/`PageSize`) instead of
 * a bare array - `pageNo`/`pageSize` are optional query params (falling back
 * to this app's usual list-page defaults, see `pagination.constants.ts`)
 * forwarded straight through to whichever backend endpoint the caller's role
 * resolves to, and the resolved `totalCount`/`pageNo`/`pageSize` are echoed
 * back so `TimesheetHistoryTable`'s shared `Pagination` control can render
 * for every role, not just `SystemAdmin`/`ProjectAdmin`.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const claims = accessToken ? decodeAccessToken(accessToken) : null;

  if (!accessToken || isTokenExpired(claims)) {
    return NextResponse.json({ message: 'Your session has expired. Please log in again.' }, { status: 401 });
  }

  const role = extractRole(claims);
  const userId = extractUserId(claims);
  if (!userId) {
    return NextResponse.json({ message: 'Could not identify the current user.' }, { status: 401 });
  }

  const { pageNo, pageSize } = resolvePagination(new URL(request.url).searchParams, {
    pageNo: DEFAULT_PAGE_NO,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  try {
    let entryDtos: TimesheetEntryDto[];
    let totalCount: number;
    let resolvedPageNo: number;
    let resolvedPageSize: number;

    if (role === 'ProjectAdmin') {
      const summary = await timesheetsBackend.getProjectAdminTimesheetSummary(accessToken, { pageNo, pageSize });
      entryDtos = summary?.Items ?? [];
      totalCount = summary?.TotalCount ?? 0;
      resolvedPageNo = summary?.PageNo ?? pageNo;
      resolvedPageSize = summary?.PageSize ?? pageSize;
    } else {
      const result =
        role === 'SystemAdmin'
          ? await timesheetsBackend.getTimesheetEntries(accessToken, { pageNo, pageSize })
          : await timesheetsBackend.getTimesheetEntries(accessToken, { userId, pageNo, pageSize });
      entryDtos = result.Items;
      totalCount = result.TotalCount;
      resolvedPageNo = result.PageNo;
      resolvedPageSize = result.PageSize;
    }

    const payload: TimesheetHistoryResponsePayload = {
      entries: mapTimesheetHistoryEntryList(entryDtos),
      totalCount,
      pageNo: resolvedPageNo,
      pageSize: resolvedPageSize,
    };
    return NextResponse.json<TimesheetHistoryResponsePayload>(payload, { status: 200 });
  } catch (error) {
    logger.error('Load timesheet history failed', error);
    const details = getBackendErrorDetails(error, 'Could not load timesheet history.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
