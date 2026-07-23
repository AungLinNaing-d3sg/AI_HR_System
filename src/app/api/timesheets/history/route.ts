import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as timesheetsBackend from '@/lib/api/timesheetsBackend.api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/constants/auth.constants';
import { getBackendErrorDetails } from '@/lib/utils/backendError';
import { decodeAccessToken, extractRole, extractUserId, isTokenExpired } from '@/lib/utils/jwt';
import { logger } from '@/lib/utils/logger';
import { mapTimesheetHistoryEntryList } from '@/lib/utils/mapTimesheet';
import type { TimesheetEntryDto, TimesheetHistoryResponsePayload } from '@/types/api.types';

/**
 * GET /api/timesheets/history
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
 */
export async function GET(): Promise<NextResponse> {
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

  try {
    let entryDtos: TimesheetEntryDto[];
    if (role === 'ProjectAdmin') {
      const summary = await timesheetsBackend.getProjectAdminTimesheetSummary(accessToken);
      entryDtos = summary?.Entries ?? [];
    } else if (role === 'SystemAdmin') {
      entryDtos = await timesheetsBackend.getTimesheetEntries(accessToken, {});
    } else {
      entryDtos = await timesheetsBackend.getTimesheetEntries(accessToken, { userId });
    }

    const payload: TimesheetHistoryResponsePayload = { entries: mapTimesheetHistoryEntryList(entryDtos) };
    return NextResponse.json<TimesheetHistoryResponsePayload>(payload, { status: 200 });
  } catch (error) {
    logger.error('Load timesheet history failed', error);
    const details = getBackendErrorDetails(error, 'Could not load timesheet history.');
    return NextResponse.json({ message: details.message, errors: details.errors }, { status: details.status });
  }
}
